import React, { useState } from "react";
import Dashboard from "./Components/Dashboard";
import HeartRateMeasuring from "./Components/HeartRateMeasuring";

const App = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");

  return (
    <>
      {currentPage === "dashboard" && (
        <Dashboard onStartMeasuring={() => setCurrentPage("measuring")} />
      )}
      {currentPage === "measuring" && (
        <HeartRateMeasuring
          onBack={() => setCurrentPage("dashboard")}
          onStop={() => setCurrentPage("dashboard")}
        />
      )}
    </>
  );
};

export default App;
