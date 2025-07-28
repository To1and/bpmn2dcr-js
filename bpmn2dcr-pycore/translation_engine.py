# translation_engine.py

from dataclasses import dataclass, field
from typing import List, Dict, Literal, Tuple
from bpmn_parser import BPMNProcess, BPMNObject


@dataclass
class DCREvent:
    id: str
    label: str


@dataclass(frozen=True)
class DCRRelation:
    source_id: str
    target_id: str
    relation_type: Literal['condition', 'response', 'include', 'exclude']


@dataclass
class DCRGraph:
    events: Dict[str, DCREvent] = field(default_factory=dict)
    relations: List[DCRRelation] = field(default_factory=list)
    initial_marking: Dict[str, Tuple[bool, bool, bool]
                          ] = field(default_factory=dict)
    labelling_function: Dict[str, str] = field(default_factory=dict)


class TranslationEngine:

    def __init__(self, bpmn_process: BPMNProcess):
        """
        初始化翻译引擎。
        该构造函数接收一个已解析和验证过的 BPMNProcess 对象作为输入，
        并准备一个空的 DCRGraph 对象用于存放翻译结果。它还初始化了
        用于生成唯一辅助事件ID的计数器，以及一个关键的映射表 or_join_flow_map
        来处理包容性网关的复杂逻辑。

        Args:
            bpmn_process (BPMNProcess): 从 bpmn_parser.py 生成的结构化BPMN流程对象。
        """
        self.bpmn_process = bpmn_process
        self.dcr_graph = DCRGraph()
        self.auxiliary_event_counters = {"AND": 0, "OR": 0}
        self.or_join_flow_map: Dict[str, Tuple[str, str]] = {}

    def translate(self) -> DCRGraph:
        """
        执行从BPMN到DCR的完整翻译流程。
        这是该类的核心公共方法，它按照严谨的顺序调用一系列私有方法来完成翻译：
        1. 预处理BPMN模型，处理特定模式（如简单的OR路径）。
        2. 将所有BPMN对象（包括预处理中新增的）映射为DCR事件。
        3. 创建DCR所需的辅助事件并建立映射关系。
        4. 将BPMN顺序流翻译成DCR关系。
        5. 清理（去重）生成的关系并返回最终的DCR图。

        Returns:
            DCRGraph: 一个完整的、表示源BPMN模型的DCR图对象。
        """
        self._preprocess_bpmn_model()
        self._perform_object_mapping()
        self._prepare_dcr_mappings()
        self._perform_relation_mapping()
        self.dcr_graph.relations = list(set(self.dcr_graph.relations))
        return self.dcr_graph

    def _preprocess_bpmn_model(self):
        """
        在正式翻译前对内存中的BPMN模型进行结构性修改。
        此步骤的目的是为了简化后续的翻译逻辑，通过处理一些复杂的或特殊的BPMN模式。
        当前，它主要处理一个包容性网关的特殊情况：当一条分支仅包含一个任务时，
        在该任务前插入一个虚拟的"Trigger"任务。这有助于统一和简化OR-Join的翻译规则。
        """
        inclusive_pairs = [p for p in self.bpmn_process.gateway_pairs.values(
        ) if p.gateway_type == 'Inclusive']
        trigger_counter = 1

        for pair in inclusive_pairs:
            for trace in pair.inclusive_traces:
                start_obj = self.bpmn_process.objects.get(
                    trace.start_object_id)
                if start_obj and trace.start_object_id == trace.end_object_id and start_obj.element_type == 'Task':
                    task_obj = start_obj

                    trigger_id = f"or_{pair.pair_id}_trigger_{trigger_counter}"
                    trigger_name = f"OR {pair.pair_id} Trigger {trigger_counter}"
                    trigger_obj = BPMNObject(
                        id=trigger_id, element_type='Task', name=trigger_name, system_name=trigger_name)
                    self.bpmn_process.objects[trigger_id] = trigger_obj
                    trigger_counter += 1

                    flow_to_task_id = next((fid for fid, (s, t) in self.bpmn_process.sequence_flows.items(
                    ) if s == pair.split_gateway_id and t == task_obj.id), None)
                    if flow_to_task_id:
                        self.bpmn_process.sequence_flows[flow_to_task_id] = (
                            pair.split_gateway_id, trigger_id)
                        trigger_obj.incoming_flows.append(flow_to_task_id)

                    new_flow_id = f"flow_{trigger_id}_{task_obj.id}"
                    self.bpmn_process.sequence_flows[new_flow_id] = (
                        trigger_id, task_obj.id)

                    if flow_to_task_id in task_obj.incoming_flows:
                        task_obj.incoming_flows.remove(flow_to_task_id)
                    task_obj.incoming_flows.append(new_flow_id)
                    trigger_obj.outgoing_flows.append(new_flow_id)

                    trace.start_object_id = trigger_id

    def _perform_object_mapping(self):
        """
        将所有BPMN对象映射为DCR事件。
        此方法遍历BPMNProcess对象中的所有元素（任务、事件、网关），
        并为每个元素创建一个对应的DCREvent。它会设置事件的ID和标签，
        并根据BPMN对象的类型确定其在DCR图中的初始标记（Marking）。
        开始事件被标记为初始激活 (pending, included)，其他所有事件默认为非激活。
        同时，为每个DCR事件添加一条自我排斥（self-exclusion）关系，以确保其单次执行语义。
        """
        for bpmn_obj in self.bpmn_process.objects.values():
            event_id, label = bpmn_obj.id, bpmn_obj.system_name
            initial_marking = (False, True, True) if bpmn_obj.event_type == 'StartEvent' else (
                False, False, False)

            self.dcr_graph.events[event_id] = DCREvent(
                id=event_id, label=label)
            self.dcr_graph.initial_marking[event_id] = initial_marking
            self.dcr_graph.labelling_function[event_id] = label
            self.dcr_graph.relations.append(
                DCRRelation(event_id, event_id, 'exclude'))

    def _prepare_dcr_mappings(self):
        """
        为复杂的网关逻辑（特别是包容性网关）准备必要的辅助事件和映射关系。
        在所有BPMN对象都已映射为DCR事件后，此方法会：
        1. 遍历所有包容性网关对。
        2. 对于每个网关对的分支（trace），创建一个对应的OR-State辅助事件。
        3. 填充 `or_join_flow_map`，将流入OR-Join的顺序流ID与对应的OR-State辅助事件ID
           以及该分支的起始对象ID关联起来。这个映射是后续正确翻译OR-Join语义的关键。
        """
        inclusive_pairs = [p for p in self.bpmn_process.gateway_pairs.values(
        ) if p.gateway_type == 'Inclusive']
        for pair in inclusive_pairs:
            for trace in pair.inclusive_traces:
                flow_into_join_id = next((fid for fid, (s, t) in self.bpmn_process.sequence_flows.items()
                                          if s == trace.end_object_id and t == pair.join_gateway_id), None)
                if flow_into_join_id:
                    aux_event_id = self._create_auxiliary_event(
                        "OR", trace.trace_id)
                    self.or_join_flow_map[flow_into_join_id] = (
                        aux_event_id, trace.start_object_id)

    def _create_auxiliary_event(self, event_type: Literal["AND", "OR"], unique_ref) -> str:
        """
        创建一个DCR辅助状态事件（Auxiliary State Event）。
        这些事件在源BPMN模型中没有直接对应，它们是为实现复杂的同步逻辑（如AND-Join和OR-Join）
        而引入的“状态持有者”。此方法会生成一个唯一的ID和标签，根据类型设置其初始标记
        （AND-State默认为included），并将其添加到DCR图中。

        Args:
            event_type (Literal["AND", "OR"]): 辅助事件的类型。
            unique_ref: 一个用于生成唯一ID的参考标识符。

        Returns:
            str: 新创建的辅助事件的ID。
        """
        self.auxiliary_event_counters[event_type] += 1
        counter = self.auxiliary_event_counters[event_type]
        event_id = f"s_{counter}_{event_type}_{unique_ref}"
        label = f"{event_type} State {counter}"

        initial_marking = (False, True, False) if event_type == "AND" else (
            False, False, False)

        if event_id not in self.dcr_graph.events:
            self.dcr_graph.events[event_id] = DCREvent(
                id=event_id, label=label)
            self.dcr_graph.initial_marking[event_id] = initial_marking
            self.dcr_graph.labelling_function[event_id] = label
            self.dcr_graph.relations.append(
                DCRRelation(event_id, event_id, 'exclude'))
        return event_id

    def _perform_relation_mapping(self):
        """
        执行将BPMN顺序流到DCR关系的核心映射逻辑。
        此方法遍历模型中所有的顺序流。对于每个流，它会判断其是简单的连接还是
        连接到网关的复杂流，然后分派给相应的专用映射函数
        (_map_basic_relation, _map_xor_gateway_relation 等)来生成正确的DCR关系。
        """
        split_ids = {
            p.split_gateway_id for p in self.bpmn_process.gateway_pairs.values()}
        join_ids = {
            p.join_gateway_id for p in self.bpmn_process.gateway_pairs.values()}

        for flow_id, (source_id, target_id) in self.bpmn_process.sequence_flows.items():
            source_obj = self.bpmn_process.objects.get(source_id)
            if not source_obj:
                continue

            is_gateway_rel = source_id in split_ids or target_id in join_ids
            if not is_gateway_rel:
                self._map_basic_relation(source_id, target_id)
            else:
                gateway_obj = source_obj if source_id in split_ids else self.bpmn_process.objects[
                    target_id]
                if gateway_obj.gateway_type == 'Exclusive':
                    self._map_xor_gateway_relation(source_id, target_id)
                elif gateway_obj.gateway_type == 'Parallel':
                    self._map_and_gateway_relation(source_id, target_id)
                elif gateway_obj.gateway_type == 'Inclusive':
                    self._map_or_gateway_relation(
                        source_id, target_id, flow_id)

    def _map_basic_relation(self, source_id: str, target_id: str):
        """
        将一个基本的顺序流映射为DCR关系。
        一个基本的顺序流被翻译成两条DCR关系：
        1. Response (响应): 当源事件执行后，目标事件成为“待办”（pending）。
        2. Include (包含): 当源事件执行后，目标事件被“包含”（included），即可被执行。

        Args:
            source_id (str): 源对象的ID。
            target_id (str): 目标对象的ID。
        """
        self.dcr_graph.relations.append(
            DCRRelation(source_id, target_id, 'response'))
        self.dcr_graph.relations.append(
            DCRRelation(source_id, target_id, 'include'))

    def _map_xor_gateway_relation(self, source_id: str, target_id: str):
        """
        映射与异或网关（XOR Gateway）相关的顺序流。
        - 对于从XOR-Split流出的分支，除了创建基本的response和include关系外，还会
          在所有兄弟分支之间添加相互的exclude关系，以确保执行其中一条分支会禁止其他所有分支。
        - 对于流入XOR-Join的流，其行为与基本关系相同，因此直接调用 _map_basic_relation。

        Args:
            source_id (str): 源对象的ID。
            target_id (str): 目标对象的ID。
        """
        source_obj = self.bpmn_process.objects[source_id]
        if source_obj.gateway_function == 'Split':
            self._map_basic_relation(source_id, target_id)
            all_targets = [self.bpmn_process.sequence_flows[fid][1]
                           for fid in source_obj.outgoing_flows]
            for sibling_id in all_targets:
                if target_id != sibling_id:
                    self.dcr_graph.relations.append(
                        DCRRelation(target_id, sibling_id, 'exclude'))
                    self.dcr_graph.relations.append(
                        DCRRelation(sibling_id, target_id, 'exclude'))
        else:
            self._map_basic_relation(source_id, target_id)

    def _map_and_gateway_relation(self, source_id: str, target_id: str):
        """
        映射与并行网关（AND Gateway）相关的顺序流。
        - 对于从AND-Split流出的分支，创建基本的response和include关系，并额外添加一条
          从Split到其对应Join的response关系，以确保Join网关在Split执行后就进入等待状态。
        - 对于流入AND-Join的流，使用一个AND-State辅助事件来建模同步：当该分支完成时，
          它会exclude对应的辅助事件；而AND-Join事件有一个condition，要求其所有分支
          对应的辅助事件都必须被exclude后才能执行。

        Args:
            source_id (str): 源对象的ID。
            target_id (str): 目标对象的ID。
        """
        source_obj = self.bpmn_process.objects[source_id]
        if source_obj.gateway_function == 'Split':
            self._map_basic_relation(source_id, target_id)
            pair = next(p for p in self.bpmn_process.gateway_pairs.values(
            ) if p.split_gateway_id == source_id)
            self.dcr_graph.relations.append(DCRRelation(
                source_id, pair.join_gateway_id, 'response'))
        else:
            aux_id = self._create_auxiliary_event("AND", source_id)
            self.dcr_graph.relations.append(
                DCRRelation(source_id, aux_id, 'exclude'))
            self.dcr_graph.relations.append(
                DCRRelation(aux_id, target_id, 'condition'))
            self.dcr_graph.relations.append(
                DCRRelation(source_id, target_id, 'include'))

    def _map_or_gateway_relation(self, source_id: str, target_id: str, flow_id: str):
        """
        映射与包容性网关（OR Gateway）相关的顺序流。
        - 对于从OR-Split流出的分支，除了创建基本关系和到Join的response关系外，还添加
          一条从Join到该分支起点的exclude关系。这确保一旦Join执行，所有未被选择的分支
          都会被禁用，防止它们在之后被错误地激活。
        - 对于流入OR-Join的流，使用一个OR-State辅助事件和 `or_join_flow_map` 来建模
          复杂的同步逻辑。当一个分支被激活时（即它的起点被执行），它会include对应的
          OR-State；当这个分支完成并到达Join前，它会exclude这个OR-State；OR-Join
          则有一系列condition，要求所有被激活分支对应的OR-State都必须被exclude。

        Args:
            source_id (str): 源对象的ID。
            target_id (str): 目标对象的ID。
            flow_id (str): 当前正在处理的顺序流的ID。
        """
        source_obj = self.bpmn_process.objects[source_id]
        if source_obj.gateway_function == 'Split':
            pair = next(p for p in self.bpmn_process.gateway_pairs.values(
            ) if p.split_gateway_id == source_id)
            self._map_basic_relation(source_id, target_id)
            self.dcr_graph.relations.append(DCRRelation(
                source_id, pair.join_gateway_id, 'response'))
            self.dcr_graph.relations.append(DCRRelation(
                pair.join_gateway_id, target_id, 'exclude'))
        else:
            if flow_id in self.or_join_flow_map:
                aux_event_id, trace_start_id = self.or_join_flow_map[flow_id]
                self.dcr_graph.relations.append(
                    DCRRelation(source_id, aux_event_id, 'exclude'))
                self.dcr_graph.relations.append(
                    DCRRelation(aux_event_id, target_id, 'condition'))
                self.dcr_graph.relations.append(
                    DCRRelation(source_id, target_id, 'include'))
                self.dcr_graph.relations.append(DCRRelation(
                    trace_start_id, aux_event_id, 'include'))
