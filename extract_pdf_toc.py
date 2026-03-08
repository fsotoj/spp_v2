import sys
try:
    import PyPDF2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
    import PyPDF2

def get_toc(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        try:
            outlines = reader.outline
            print("Table of Contents found:")
            for item in outlines:
                if isinstance(item, list):
                    continue
                title = item.title if hasattr(item, 'title') else item.get('/Title', 'Unknown Title')
                print(f"- {title}")
        except Exception as e:
            print(f"Could not extract TOC from outlines: {e}")
            
        print("\n\nFirst 5 pages text preview:")
        for i in range(min(5, len(reader.pages))):
            print(f"--- Page {i+1} ---")
            print(reader.pages[i].extract_text()[:400])

if __name__ == "__main__":
    get_toc(sys.argv[1])
