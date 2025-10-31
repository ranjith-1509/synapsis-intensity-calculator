import React from "react";
import GazeTracker from "./GazeTracker";

const Opencamera = () => {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      color: "#e0e0e0",
    }}>
 
            <GazeTracker />
          </div>
  
   
  );
};

export default Opencamera;
