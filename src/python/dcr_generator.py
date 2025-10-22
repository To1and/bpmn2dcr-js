# dcr_generator.py

import xml.etree.ElementTree as ET
from xml.dom import minidom
from translation_engine import DCRGraph


class DCRGenerator:

    def __init__(self, dcr_graph: DCRGraph):
        """
        初始化DCR图生成器。

        Args:
            dcr_graph (DCRGraph): 一个由 translation_engine.py 生成的、包含了
                                  DCR图完整结构和初始状态的内部数据对象。
        """
        self.dcr_graph = dcr_graph

    def to_xml(self, output_file_path: str):
        """
        将内部的DCRGraph对象完整地转换为一个XML文件，并保存到指定路径。
        该方法是生成最终输出文件的主要入口。它会构建XML的根元素，
        然后分别调用内部方法创建 <specification> (静态结构) 和 <runtime> (动态状态) 
        两个主要部分。最后，它会对生成的XML字符串进行格式化（美化），
        使其具有良好的可读性，并将其写入目标文件。

        Args:
            output_file_path (str): 输出XML文件的目标路径和文件名。
        """
        dcrgraph_root = ET.Element('dcrgraph')

        specification = self._create_specification()
        dcrgraph_root.append(specification)

        runtime = self._create_runtime()
        dcrgraph_root.append(runtime)

        xml_str = ET.tostring(dcrgraph_root, 'unicode')
        dom = minidom.parseString(xml_str)
        pretty_xml_str = dom.toprettyxml(indent="  ")

        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.write(pretty_xml_str)

    def _create_specification(self):
        """
        构建DCR图的 <specification> XML部分。
        这个私有方法负责定义DCR图的静态结构，包括所有的事件、标签、
        以及它们之间的约束关系（conditions, responses, includes, excludes）。
        它会遍历DCRGraph对象中的相应字段，并生成符合DCR-JS XML格式的
        XML元素。为了确保与DCR-JS工具的兼容性，它还会创建一些当前未使用但
        格式必需的空标签。

        Returns:
            ET.Element: 一个包含了DCR图所有静态定义的 <specification> XML元素。
        """
        specification = ET.Element('specification')

        resources = ET.SubElement(specification, 'resources')
        events_xml = ET.SubElement(resources, 'events')
        labels_xml = ET.SubElement(resources, 'labels')
        label_mappings_xml = ET.SubElement(resources, 'labelMappings')

        ET.SubElement(resources, 'subProcesses')
        ET.SubElement(resources, 'variables')
        ET.SubElement(resources, 'expressions')
        variable_accesses = ET.SubElement(resources, 'variableAccesses')
        ET.SubElement(variable_accesses, 'readAccessess')
        ET.SubElement(variable_accesses, 'writeAccessess')

        unique_labels = set(self.dcr_graph.labelling_function.values())
        for label_text in sorted(list(unique_labels)):
            ET.SubElement(labels_xml, 'label', {'id': label_text})

        x_pos, y_pos, x_step, y_step, max_x = 100, 100, 180, 200, 900
        for event in self.dcr_graph.events.values():
            event_el = ET.SubElement(events_xml, 'event', {'id': event.id})

            custom = ET.SubElement(event_el, 'custom')
            visualization = ET.SubElement(custom, 'visualization')
            ET.SubElement(visualization, 'location', {
                          'xLoc': str(x_pos), 'yLoc': str(y_pos)})
            ET.SubElement(visualization, 'size', {
                          'width': "130", 'height': "150"})
            x_pos += x_step
            if x_pos > max_x:
                x_pos = 100
                y_pos += y_step

            ET.SubElement(label_mappings_xml, 'labelMapping', {
                          'eventId': event.id, 'labelId': event.label})

        constraints = ET.SubElement(specification, 'constraints')
        conditions = ET.SubElement(constraints, 'conditions')
        responses = ET.SubElement(constraints, 'responses')
        includes = ET.SubElement(constraints, 'includes')
        excludes = ET.SubElement(constraints, 'excludes')

        ET.SubElement(constraints, 'coresponces')
        ET.SubElement(constraints, 'milestones')
        ET.SubElement(constraints, 'updates')
        ET.SubElement(constraints, 'spawns')

        relation_counter = 1
        for rel in self.dcr_graph.relations:
            rel_attrs = {'sourceId': rel.source_id, 'targetId': rel.target_id}

            relation_map = {
                'condition': conditions,
                'response': responses,
                'exclude': excludes,
                'include': includes
            }

            if rel.relation_type in relation_map:
                parent_xml_element = relation_map[rel.relation_type]
                rel_el = ET.SubElement(
                    parent_xml_element, rel.relation_type, rel_attrs)

                custom = ET.SubElement(rel_el, 'custom')
                ET.SubElement(custom, 'waypoints')
                ET.SubElement(
                    custom, 'id', {'id': f'Relation_{relation_counter}'})
                relation_counter += 1

        return specification

    def _create_runtime(self):
        """
        构建DCR图的 <runtime> XML部分。
        这个私有方法负责定义DCR图的初始动态状态，即初始标记（Marking）。
        它会根据 DCRGraph 对象中的 `initial_marking` 数据，生成XML元素来指明
        在流程开始时，哪些事件是已执行的（executed）、被包含的（included）
        或待处理的（pending）。

        Returns:
            ET.Element: 一个包含了DCR图初始状态的 <runtime> XML元素。
        """
        runtime = ET.Element('runtime')
        marking = ET.SubElement(runtime, 'marking')

        executed = ET.SubElement(marking, 'executed')
        included = ET.SubElement(marking, 'included')
        pending_responses = ET.SubElement(marking, 'pendingResponses')
        ET.SubElement(marking, 'globalStore')

        for event_id, (is_executed, is_included, is_pending) in self.dcr_graph.initial_marking.items():
            if is_executed:
                ET.SubElement(executed, 'event', {'id': event_id})
            if is_included:
                ET.SubElement(included, 'event', {'id': event_id})
            if is_pending:
                ET.SubElement(pending_responses, 'event', {'id': event_id})

        return runtime
