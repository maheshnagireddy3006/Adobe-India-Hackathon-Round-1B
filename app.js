// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const input = document.getElementById('pdf-upload');
const canvas = document.getElementById('pdf-canvas');
const outlineDiv = document.getElementById('outline');
const analyzeBtn = document.getElementById('analyze-btn');
const analysisResults = document.getElementById('analysis-results');
const personaInput = document.getElementById('persona-input');
const jobInput = document.getElementById('job-input');

let currentPdfData = null;
let currentPdf = null;
let currentPage = 1;
let totalPages = 0;

input.addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;
  
  outlineDiv.innerHTML = "<p>⏳ Processing PDF... (This should take less than 10 seconds)</p>";
  analysisResults.innerHTML = "";
  const contentDiv = document.getElementById('pdf-content');
  if (contentDiv) contentDiv.innerHTML = "";
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    currentPdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    totalPages = currentPdf.numPages;
    currentPage = 1;
    
    // Render first page
    await renderPage(currentPage);
    
    // Add navigation controls
    console.log('Adding PDF navigation...');
    addPdfNavigation();
    console.log('PDF navigation should be visible now');
    
    // Ensure navigation is visible after a short delay
    setTimeout(() => {
      const nav = document.querySelector('.pdf-navigation');
      if (nav) {
        console.log('Navigation found and should be visible');
        nav.style.display = 'flex';
        nav.style.visibility = 'visible';
      } else {
        console.error('Navigation not found after timeout');
      }
    }, 100);

    const [outline, fullText] = await Promise.all([
      extractPdfOutline(currentPdf),
      extractFullText(currentPdf)
    ]);
    currentPdfData = {
      filename: file.name,
      outline: outline,
      fullText: fullText,
      totalPages: totalPages
    };
    
    displayOutline(outline, file.name);
    displayFullText(fullText, file.name);
    
  } catch (error) {
    outlineDiv.innerHTML = `<p style="color: red;">Error processing PDF: ${error.message}</p>`;
  }
});

async function renderPage(pageNum) {
  if (!currentPdf || pageNum < 1 || pageNum > totalPages) return;
  
  try {
    const page = await currentPdf.getPage(pageNum);
    const viewport = page.getViewport({scale: 1.0});
    
    // Set canvas size to accommodate the page
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
    
    // Update page indicator
    updatePageIndicator();
  } catch (error) {
    console.error('Error rendering page:', error);
  }
}

function addPdfNavigation() {
  const pdfSection = document.querySelector('.pdf-section');
  
  if (!pdfSection) {
    console.error('PDF section not found');
    return;
  }
  
  // Remove existing navigation if any
  const existingNav = pdfSection.querySelector('.pdf-navigation');
  if (existingNav) {
    existingNav.remove();
  }
  
  // Create navigation controls
  const navigation = document.createElement('div');
  navigation.className = 'pdf-navigation';
  navigation.style.display = 'flex'; // Ensure it's visible
  navigation.style.backgroundColor = '#f8f9fa'; // Light gray background
  navigation.style.border = '1px solid #e9ecef'; // Subtle border
  navigation.style.padding = '12px'; // Compact padding
  navigation.style.margin = '8px 12px'; // Compact margin with horizontal spacing
  navigation.style.width = 'calc(100% - 24px)'; // Ensure it stays within bounds
  navigation.innerHTML = `
    <div class="nav-controls">
      <button id="prev-page" class="nav-btn" ${currentPage === 1 ? 'disabled' : ''}>‹ Previous</button>
      <span id="page-indicator" class="page-indicator">Page ${currentPage} of ${totalPages}</span>
      <button id="next-page" class="nav-btn" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>
    </div>
    <div class="page-jump">
      <input type="number" id="page-jump-input" min="1" max="${totalPages}" value="${currentPage}" placeholder="Go to page">
      <button id="go-to-page" class="nav-btn">Go</button>
    </div>
  `;
  
  pdfSection.appendChild(navigation);
  console.log('PDF navigation added successfully');
  console.log('Navigation element:', navigation);
  console.log('PDF section children:', pdfSection.children);
  
  // Add event listeners
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
      updateNavigationButtons();
    }
  });
  
  document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage);
      updateNavigationButtons();
    }
  });
  
  document.getElementById('go-to-page').addEventListener('click', () => {
    const pageInput = document.getElementById('page-jump-input');
    const targetPage = parseInt(pageInput.value);
    if (targetPage >= 1 && targetPage <= totalPages) {
      currentPage = targetPage;
      renderPage(currentPage);
      updateNavigationButtons();
    }
  });
  
  document.getElementById('page-jump-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('go-to-page').click();
    }
  });
}

function updatePageIndicator() {
  const indicator = document.getElementById('page-indicator');
  if (indicator) {
    indicator.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  
  const pageInput = document.getElementById('page-jump-input');
  if (pageInput) {
    pageInput.value = currentPage;
  }
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;
  
  updatePageIndicator();
}

async function extractPdfOutline(pdf) {
  const outline = [];
  const textBlocks = [];
  
  const maxPages = pdf.numPages; // Process all pages for complete analysis
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      textContent.items.forEach(item => {
        const text = item.str.trim();
        if (text && text.length > 1) {
          textBlocks.push({
            text: text,
            size: Math.round(item.height * 10) / 10,
            bold: item.fontName && (item.fontName.includes('Bold') || item.fontName.includes('bold')),
            page: pageNum,
            x: item.transform[4],
            y: item.transform[5]
          });
        }
      });
    } catch (error) {
      console.warn(`Error processing page ${pageNum}:`, error);
    }
  }
  
  if (textBlocks.length === 0) {
    return { title: "", outline: [] };
  }
  
  const sizes = textBlocks.map(b => b.size);
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const maxSize = Math.max(...sizes);
  
  let title = "";
  const seenTexts = new Set();
  
  for (const block of textBlocks) {
    const text = block.text;
    const lowerText = text.toLowerCase();
    
    if (seenTexts.has(lowerText) || text.length > 120) continue;
    seenTexts.add(lowerText);
    
    const isLargeText = block.size > avgSize * 1.1;
    const isBold = block.bold;
    const isShortLine = text.length < 80;
    const hasNumbers = /^\d+\.?\s/.test(text);
    const isAllCaps = text === text.toUpperCase() && text.length > 3;
    const hasColons = text.endsWith(':');
    const isFormField = /^[A-Z][a-z]+.*:/.test(text); 
    
    let score = 0;
    if (isBold) score += 3;
    if (isLargeText) score += 2;
    if (hasNumbers) score += 2;
    if (isAllCaps && text.length < 50) score += 2;
    if (hasColons) score += 1;
    if (isFormField) score += 1;
    if (isShortLine) score += 1;
    
    if (score >= 3 || (score >= 2 && (isBold || isLargeText))) {
      let level = "H3";
      
      if (block.size >= maxSize * 0.9 || (isBold && isLargeText)) {
        level = "H1";
        if (!title && text.length < 100) {
          title = text;
          continue;
        }
      } else if (block.size >= avgSize * 1.3 || (isBold && hasNumbers)) {
        level = "H2";
      }
      
      outline.push({level: level, text: text, page: block.page});
      
      if (outline.length >= 50) break; // Increased limit to 50 outline items
    }
  }
  
  if (outline.length === 0) {
    for (const block of textBlocks) {
      const text = block.text;
      if (text.length > 5 && text.length < 100 && 
          (block.bold || block.size > avgSize || /^\d+\./.test(text) || text.endsWith(':'))) {
        outline.push({level: "H2", text: text, page: block.page});
        if (outline.length >= 50) break;
      }
    }
  }
  
  return { title, outline };
}

async function extractFullText(pdf) {
  let fullText = "";
  
  // Process all pages for complete analysis
  const maxPages = pdf.numPages;
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = `\n--- PAGE ${pageNum} ---\n`;
      let pageContent = "";
      
      // Sort text items by their position (top to bottom, left to right)
      const sortedItems = textContent.items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5]; // Y position (top to bottom)
        if (Math.abs(yDiff) > 5) return yDiff; // If Y difference is significant, sort by Y
        return a.transform[4] - b.transform[4]; // Otherwise sort by X position (left to right)
      });
      
      sortedItems.forEach(item => {
        const text = item.str.trim();
        if (text) {
          pageContent += text + ' ';
        }
      });
      
      pageText += pageContent + '\n';
      fullText += pageText;
      
    } catch (error) {
      console.warn(`Error extracting text from page ${pageNum}:`, error);
      // Add a placeholder for failed pages
      fullText += `\n--- PAGE ${pageNum} ---\n[Error extracting content from this page]\n`;
    }
  }
  
  return fullText;
}

function displayFullText(fullText, filename) {
  const contentDiv = document.getElementById('pdf-content');
  if (contentDiv) {
    contentDiv.innerHTML = `<pre style="margin:0; white-space: pre-wrap; font-size: 12px;">${fullText}</pre>`;
  }
}

function displayOutline(outlineData, filename) {
  let html = `<h3>📄 ${filename}</h3>`;
  
  if (outlineData.title) {
    html += `<div class="title"><strong>Title:</strong> ${outlineData.title}</div>`;
  }
  
  if (outlineData.outline.length > 0) {
    html += "<h4>Document Outline:</h4><ul class='outline-list'>";
    outlineData.outline.forEach(item => {
      const indent = item.level === 'H2' ? 'style="margin-left: 20px;"' : 
                     item.level === 'H3' ? 'style="margin-left: 40px;"' : '';
      html += `<li ${indent}><span class="level-${item.level.toLowerCase()}">${item.level}</span> ${item.text} <span class="page-num">(Page ${item.page})</span></li>`;
    });
    html += "</ul>";
  } else {
    html += "<p>No structured headings found in this PDF.</p>";
  }
  
  outlineDiv.innerHTML = html;
}

analyzeBtn.addEventListener('click', function() {
  if (!currentPdfData) {
    analysisResults.innerHTML = "<p style='color: orange;'>Please upload a PDF first.</p>";
    analysisResults.classList.add('show');
    return;
  }
  
  const persona = personaInput.value.trim();
  const job = jobInput.value.trim();
  
  if (!persona || !job) {
    analysisResults.innerHTML = "<p style='color: orange;'>Please enter both persona and job description.</p>";
    analysisResults.classList.add('show');
    return;
  }
  
  performPersonaAnalysis(currentPdfData, persona, job);
});

function performPersonaAnalysis(pdfData, persona, job) {
  analysisResults.innerHTML = "<p>🔍 Analyzing sections for relevance...</p>";
  analysisResults.classList.add('show'); 
  
  setTimeout(() => {
    try {
      if (job.toLowerCase().includes('summarize') || job.toLowerCase().includes('summary')) {
        generateSummary(pdfData, persona, job);
        return;
      }
      let outlineArray = [];
      if (Array.isArray(pdfData.outline.outline)) {
        outlineArray = pdfData.outline.outline;
      } else if (Array.isArray(pdfData.outline)) {
        outlineArray = pdfData.outline;
      }
      const keywords = (persona + " " + job)
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 10);

      const scoredSections = [];

      for (const section of outlineArray) {
        if (section && section.text) {
          const text = section.text.toLowerCase();
          let score = 0;

          for (const keyword of keywords) {
            if (text.includes(keyword)) {
              score++;
            }
          }

          if (score > 0) {
            scoredSections.push({ ...section, score });
          }
        }
      }

      scoredSections.sort((a, b) => b.score - a.score);

      displayPersonaAnalysis(pdfData.filename, persona, job, scoredSections, keywords, outlineArray.length);

    } catch (error) {
      console.error('Analysis error:', error);
      analysisResults.innerHTML = `<p style="color: red;">Error during analysis: ${error.message}</p>`;
    }
  }, 100);
}

function generateSummary(pdfData, persona, job) {
  try {
    const fullText = pdfData.fullText || '';
    const outline = pdfData.outline.outline || [];
    const totalPages = pdfData.totalPages || 1;
    
    let summary = '';
    
    // Extract pages from full text
    const pageMatches = fullText.match(/--- PAGE \d+ ---/g);
    const pages = [];
    
    if (pageMatches) {
      pageMatches.forEach((match, index) => {
        const pageNum = match.match(/\d+/)[0];
        const nextPageMatch = pageMatches[index + 1];
        const startIndex = fullText.indexOf(match);
        const endIndex = nextPageMatch ? fullText.indexOf(nextPageMatch) : fullText.length;
        const pageContent = fullText.substring(startIndex + match.length, endIndex).trim();
        pages.push({ page: pageNum, content: pageContent });
      });
    }
    
    // Document Structure
    if (outline.length > 0) {
      summary += '**Document Structure:**\n';
      outline.forEach((item, index) => {
        summary += `${index + 1}. ${item.text} (Page ${item.page})\n`;
      });
      summary += '\n';
    }
    
    // Key Points by Page
    summary += '**Key Points:**\n';
    
    if (pages.length > 0) {
      pages.forEach(page => {
        summary += `--- PAGE ${page.page} ---\n`;
        
        // Extract key sentences from this page
        const sentences = page.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const keyWords = ['important', 'key', 'main', 'significant', 'conclusion', 'result', 'summary', 'overview', 'challenge', 'mission', 'objective', 'goal', 'purpose'];
        
        const importantSentences = sentences.filter(sentence => {
          const lowerSentence = sentence.toLowerCase();
          return keyWords.some(word => lowerSentence.includes(word)) || 
                 sentence.length > 50 || 
                 /^[A-Z][^.!?]*[.!?]$/.test(sentence.trim()); // Starts with capital letter and ends with punctuation
        }).slice(0, 8); // Increased from 5 to 8
        
        if (importantSentences.length > 0) {
          importantSentences.forEach(sentence => {
            const trimmedSentence = sentence.trim();
            if (trimmedSentence.length > 10) {
              summary += `• ${trimmedSentence}.\n`;
            }
          });
        } else {
          // If no key sentences found, take first few sentences
          const firstSentences = sentences.slice(0, 3);
          firstSentences.forEach(sentence => {
            const trimmedSentence = sentence.trim();
            if (trimmedSentence.length > 10) {
              summary += `• ${trimmedSentence}.\n`;
            }
          });
        }
        summary += '\n';
      });
    } else {
      // Fallback if page extraction failed
      const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const keyWords = ['important', 'key', 'main', 'significant', 'conclusion', 'result', 'summary', 'overview', 'challenge', 'mission', 'objective', 'goal', 'purpose'];
      
      const importantSentences = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return keyWords.some(word => lowerSentence.includes(word)) || sentence.length > 50;
      }).slice(0, 10);
      
      if (importantSentences.length > 0) {
        importantSentences.forEach(sentence => {
          const trimmedSentence = sentence.trim();
          if (trimmedSentence.length > 10) {
            summary += `• ${trimmedSentence}.\n`;
          }
        });
      }
    }
    
    // Add document statistics
    summary += `\n**Document Statistics:**\n`;
    summary += `• Total Pages: ${totalPages}\n`;
    summary += `• Total Sections: ${outline.length}\n`;
    summary += `• Document Type: ${getDocumentType(fullText)}\n`;
    
    analysisResults.innerHTML = `
      <div class="summary-results">
        <h3>📋 Document Summary</h3>
        <div class="metadata">
          <p><strong>Document:</strong> ${pdfData.filename}</p>
          <p><strong>Persona:</strong> ${persona}</p>
          <p><strong>Task:</strong> ${job}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div class="summary-content">
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6;">${summary}</pre>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Summary generation error:', error);
    analysisResults.innerHTML = `<p style="color: red;">Error generating summary: ${error.message}</p>`;
  }
}

function getDocumentType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('hackathon') || lowerText.includes('challenge')) {
    return 'Competition/Challenge Document';
  } else if (lowerText.includes('report') || lowerText.includes('analysis')) {
    return 'Report/Analysis';
  } else if (lowerText.includes('manual') || lowerText.includes('guide')) {
    return 'Manual/Guide';
  } else if (lowerText.includes('proposal') || lowerText.includes('proposal')) {
    return 'Proposal';
  } else if (lowerText.includes('contract') || lowerText.includes('agreement')) {
    return 'Contract/Agreement';
  } else {
    return 'General Document';
  }
}

function displayPersonaAnalysis(filename, persona, job, sections, keywords, totalSections = 0) {
  let html = `
    <div class="analysis-header">
      <h3>🎯 Persona Analysis Results</h3>
      <div class="metadata">
        <p><strong>Document:</strong> ${filename}</p>
        <p><strong>Persona:</strong> ${persona}</p>
        <p><strong>Job to be done:</strong> ${job}</p>
        <p><strong>Keywords:</strong> ${keywords.join(', ')}</p>
        <p><strong>Total sections found:</strong> ${totalSections}</p>
        <p><strong>Relevant sections:</strong> ${sections.length}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    </div>
  `;
  
  if (sections.length > 0) {
    html += "<h4>📊 Relevant Sections (Ranked by Importance):</h4>";
    html += "<ol class='ranked-sections'>";
    
    sections.forEach((section, index) => {
      html += `
        <li class="ranked-item">
          <div class="section-info">
            <span class="level-badge level-${section.level.toLowerCase()}">${section.level}</span>
            <span class="section-title">${section.text}</span>
            <span class="page-num">Page ${section.page}</span>
            <span class="relevance-score">Score: ${section.score}</span>
          </div>
        </li>
      `;
    });
    
    html += "</ol>";
  } else {
    html += "<p>No sections found that match the persona and job requirements. Try different keywords or check if the PDF contains relevant headings.</p>";
  }
  
  analysisResults.innerHTML = html;
}