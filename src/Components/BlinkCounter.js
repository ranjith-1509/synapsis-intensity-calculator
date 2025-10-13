import React from 'react';

const BlinkCounter = ({ blinkCount, isBlinking, isInitialized }) => {
    console.log(isBlinking,"isBlinking");
    console.log(blinkCount,"blinkCount");
    console.log(isInitialized,"isInitialized");
  return (
    <div style={{
      background: '#2d3748',
      borderRadius: '12px',
      padding: '20px',
      color: '#fff',
      textAlign: 'center'
    }}>
      <h2 style={{ margin: '0 0 16px 0' }}>Blink Counter</h2>
      
      {!isInitialized ? (
        <p>Initializing face detection...</p>
      ) : (
        <>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: isBlinking ? '#68D391' : '#fff'
          }}>
            {blinkCount}
          </div>
          <p>Total Blinks</p>
        </>
      )}
    </div>
  );
};

export default BlinkCounter;