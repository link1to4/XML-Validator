import { DtdFile } from "../types";

export const fetchDtdFiles = async (scriptUrl: string): Promise<DtdFile[]> => {
  try {
    const response = await fetch(scriptUrl, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    // Google Sheets usually returns 2D array: [[col1, col2], [col1, col2]]
    // We assume Row 1 might be header, but we'll try to detect or just map all
    // Map to DtdFile objects
    const files: DtdFile[] = [];
    
    if (Array.isArray(data)) {
        data.forEach((row: any[]) => {
            if (row && row.length >= 2) {
                // Simple check to skip a potential header row if it says exactly "Name" and "Content"
                if (row[0] === 'Name' && row[1] === 'Content') return;
                
                files.push({
                    name: String(row[0]),
                    content: String(row[1])
                });
            }
        });
    }
    
    return files;
  } catch (error) {
    console.error("Failed to fetch DTDs:", error);
    throw error;
  }
};

export const saveDtdFile = async (scriptUrl: string, file: DtdFile): Promise<boolean> => {
  try {
    // We use a POST request with 'no-cors' strictly if we don't care about response,
    // BUT Google Apps Script Web App CAN return CORS headers.
    // Ideally we use standard fetch.
    
    // To send data to GAS doPost(e), we often send text/plain stringified JSON 
    // to avoid preflight options check issues in some browsers/configurations, 
    // though modern GAS supports CORS well.
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify(file)
    });
    
    if (!response.ok) {
        throw new Error("Save request failed");
    }
    
    const result = await response.json();
    return result.status === 'success';

  } catch (error) {
    console.error("Failed to save DTD:", error);
    throw error;
  }
};

// The GAS Code snippet for the user
export const GAS_CODE_SNIPPET = `function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([body.name, body.content]);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
