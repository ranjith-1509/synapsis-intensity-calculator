// Web Worker for image processing and analysis
// This worker handles heavy image processing tasks to offload the main thread

let isInitialized = false;

// Initialize the worker
async function initializeWorker() {
  try {
    console.log('Image processing Web Worker initialized');
    isInitialized = true;
    
    // Notify main thread that worker is ready
    self.postMessage({
      type: 'WORKER_READY',
      success: true
    });
    
  } catch (error) {
    console.error('Failed to initialize Web Worker:', error);
    self.postMessage({
      type: 'WORKER_READY',
      success: false,
      error: error.message
    });
  }
}

// Process image data for gesture recognition
function processImageData(imageData, timestamp) {
  if (!isInitialized) {
    return;
  }

  try {
    // Perform image preprocessing and analysis
    const processedData = preprocessImage(imageData);
    
    // Send processed data back to main thread
    self.postMessage({
      type: 'IMAGE_PROCESSED',
      data: processedData,
      timestamp: timestamp
    });
    
  } catch (error) {
    console.error('Error processing image in worker:', error);
    self.postMessage({
      type: 'PROCESSING_ERROR',
      error: error.message,
      timestamp: timestamp
    });
  }
}

// Preprocess image data for better gesture recognition
function preprocessImage(imageData) {
  const { data, width, height } = imageData;
  const processedData = new Uint8ClampedArray(data.length);
  
  // Simple image enhancement - increase contrast and brightness
  for (let i = 0; i < data.length; i += 4) {
    // Get RGB values
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    let a = data[i + 3];
    
    // Apply contrast enhancement
    const contrast = 1.2;
    r = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
    g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
    b = Math.min(255, Math.max(0, (b - 128) * contrast + 128));
    
    // Apply brightness adjustment
    const brightness = 1.1;
    r = Math.min(255, Math.max(0, r * brightness));
    g = Math.min(255, Math.max(0, g * brightness));
    b = Math.min(255, Math.max(0, b * brightness));
    
    processedData[i] = r;
    processedData[i + 1] = g;
    processedData[i + 2] = b;
    processedData[i + 3] = a;
  }
  
  return {
    data: processedData,
    width: width,
    height: height
  };
}


// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'INITIALIZE':
      initializeWorker();
      break;
      
    case 'PROCESS_IMAGE':
      if (data.imageData && data.timestamp) {
        processImageData(data.imageData, data.timestamp);
      }
      break;
      
    case 'TERMINATE':
      self.close();
      break;
      
    default:
      console.warn('Unknown message type received in worker:', type);
  }
};

// Initialize the worker when it starts
console.log('Gesture recognition Web Worker started');
