import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./Components/Dashboard";
import HeartRateMeasuring from "./Components/HeartRateMeasuring";
import SessionDetail from "./Components/SessionDetail";
import Login from "./Components/Auth/Login";
import Signup from "./Components/Auth/Signup";
import PrivateRoute from "./Components/PrivateRoute";

const App = () => {
  const defaultRedirect = localStorage.getItem("firebaseToken")
    ? "/dashboard"
    : "/login";

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRedirect} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/heart-rate"
          element={
            <PrivateRoute>
              <HeartRateMeasuring />
            </PrivateRoute>
          }
        />
        <Route
          path="/session-detail"
          element={
            <PrivateRoute>
              <SessionDetail />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
