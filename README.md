# Adobe Hackathon - PDF Analysis Tool

## What This Project Does
This is a smart PDF reader web app that is capable of:
1. **Reading PDF files** directly in your browser and recognizing important headings
2. **Extracting document structure** with hierarchical outline (H1, H2, H3 levels)
3. **Offering persona-based analysis** according to your role and particular requirements
4. **Creating smart summaries** suited to your needs
5. **Showing results** in a clean, modern web interface

## Key Features
- **PDF processing on the client-side** with PDF.js (no need for a server)
- **Interactive preview** of PDF with page navigation
- **Programmatic extraction** of outline from document structure
- **Full text extraction** and rendering
- **Persona-based analysis** for insights with a focus
- **Intelligent summarization** based on document type and user requirement
- **Responsive design** supporting desktop and mobile

## How to Use

### Simple Setup
1. Open `index.html` in any contemporary web browser
2. Upload a PDF file via the file picker
3. Preview the PDF view, outline, and entire content
4. Enter your persona (e.g., "Investment Analyst", "Student", "Researcher")
5. Define your task (e.g., "Summarize key findings", "Locate revenue information")
6. Click "Analyze with Persona" for focused insights

## What You Get

### Document Structure
- **PDF Preview**: Interactive page-by-page view with navigation
- **Hierarchical Outline**: Automatically derived headings and sections
- **Full Text Content**: Entire document text for analysis

### Persona Analysis Results
- **Relevance Scoring**: Most important sections to your persona and task
- **Targeted Insights**: Content narrowed down to your specific role
- **Smart Summaries**: Most important points and findings for your requirements
- **Document Statistics**: Number of pages, number of sections, and document type detection

## Technical Specifications
- **Frontend:** Pure JavaScript (ES6+), HTML5, CSS3
- **PDF Processing:** PDF.js library (Mozilla's JavaScript PDF renderer)
- **No Backend Required:** Runs purely in the browser
- **Browser Compatibility:** Current JavaScript-enabled browsers
- **File Size:** Compact (~350KB in total)
- **Processing Speed:** Instant PDF rendering and analysis
- **Privacy:** All processing locally - no server data sent

## Browser Requirements
- Current web browser (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- JavaScript support
- File API support for local file loading
- Canvas API support for PDF drawing

## Supported Document Types
- Standard PDF documents
- Text-based PDFs (scanned PDFs are limited in text extraction)
- Best for structured heading documents are best for outline extraction
- Recommended: PDFs with fewer than 50 pages for maximum performance