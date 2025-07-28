# main.py

import sys
import os
from bpmn_parser import BPMNParser
from translation_engine import TranslationEngine
from dcr_generator import DCRGenerator

def clear_screen():
    """
    # 根据不同的操作系统，执行清空终端屏幕的命令。
    """
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header(title):
    """
    # 打印一个用于交互模式的美化标题头。
    """
    width = 85
    print("=" * width)
    print(f"| {title.center(width - 4)} |")
    print("=" * width)

def select_bpmn_file_interactively():
    """
    # 扫描当前目录下的.bpmn文件，并让用户以交互方式选择一个。
    # 如果只找到一个文件，则自动选择该文件。
    # 如果未找到文件，或者用户取消操作，则返回None。
    """
    try:
        bpmn_files = [f for f in os.listdir('.') if f.endswith('.bpmn')]
    except OSError as e:
        print(f"ERROR: Cannot read the current directory: {e}")
        return None

    if not bpmn_files:
        print("ERROR: No .bpmn files found in the current directory.")
        return None
    
    if len(bpmn_files) == 1:
        selected_file = bpmn_files[0]
        print(f"INFO: Auto-selected the only BPMN file found: '{selected_file}'")
        return selected_file

    clear_screen()
    print_header("Please select a BPMN file to translate:")
    for i, filename in enumerate(bpmn_files, 1):
        print(f"  [{i}] {filename}")
    
    while True:
        try:
            choice = input(f"\nEnter the file number (1-{len(bpmn_files)}) or 'q' to quit: ")
            if choice.lower() == 'q':
                return None
            choice_index = int(choice) - 1
            if 0 <= choice_index < len(bpmn_files):
                return bpmn_files[choice_index]
            else:
                print(f"Invalid input. Please enter a number between 1 and {len(bpmn_files)}.")
        except ValueError:
            print("Invalid input. Please enter a number.")
        except (KeyboardInterrupt, EOFError):
            return None

def translate_bpmn_to_dcr(input_bpmn_path: str):
    """
    # 执行从单个BPMN文件到DCR XML文件的完整翻译流程。
    # 该函数封装了整个转换逻辑：解析、验证、翻译和生成。
    # 如果BPMN模型验证失败，它将打印错误并终止。成功后，
    # 它会在与输入文件相同的目录下生成一个.dcr.xml文件。
    """
    if not os.path.exists(input_bpmn_path):
        print(f"ERROR: Input file '{input_bpmn_path}' not found.")
        sys.exit(1)

    base_name = os.path.splitext(input_bpmn_path)[0]
    output_dcr_path = f"{base_name}.dcr.xml"

    print(f"\nINFO: Starting translation for '{input_bpmn_path}'...")

    try:
        print("INFO: [1/3] Parsing and validating the BPMN model...")
        parser = BPMNParser(input_bpmn_path)
        bpmn_process, errors = parser.parse_and_validate()

        if errors:
            print(f"\nERROR: BPMN model validation failed. Please fix the following issue(s):")
            for i, error in enumerate(errors, 1):
                print(f"  {i}. {error}")
            sys.exit(1)
        
        print("INFO: ✅ BPMN model is valid.")

        print("INFO: [2/3] Translating BPMN objects to DCR graph...")
        engine = TranslationEngine(bpmn_process)
        dcr_graph = engine.translate()
        print("INFO: ✅ Translation complete.")

        print(f"INFO: [3/3] Generating DCR XML file at '{output_dcr_path}'...")
        generator = DCRGenerator(dcr_graph)
        generator.to_xml(output_dcr_path)
        print("INFO: ✅ XML file successfully generated.")

        print(f"\nSUCCESS: Translation finished. Output file is available at: {output_dcr_path}")

    except Exception as e:
        print(f"\nERROR: An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    """
    # 脚本的程序入口点。
    # 检查是否存在命令行参数。如果存在，则使用它作为输入文件路径（命令行模式）。
    # 如果不存在，则启动交互式文件选择模式。
    """
    input_file = None
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = select_bpmn_file_interactively()

    if input_file:
        translate_bpmn_to_dcr(input_file)
    else:
        print("INFO: Operation cancelled by user. Exiting.")
        sys.exit(0)