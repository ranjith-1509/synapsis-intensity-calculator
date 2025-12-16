export const exportMetricsToCSV = (session) => {
  const headers = ["Time", "Heart Rate (bpm)", "HRV (ms)"];
  const rows = session.metrics.map((metric) => {
    const date = new Date(metric.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeString = `${year}-${month}-${day} ${hours}:${minutes}`;
    return [timeString, metric.heartRate || "", metric.hrv || ""];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `metrics_data_${session.dateLabel.replace(/\s+/g, "_")}_${session.timeLabel.replace(/[: ]/g, "_")}.csv`;
  link.click();
  

};

export const exportIntensityToCSV = (session, showToast) => {
  const headers = ["Time", "Intensity"];
  const rows = session.intensityPoints.map((point) => {
    const date = new Date(point.x);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeString = `${year}-${month}-${day} ${hours}:${minutes}`;
    return [timeString, point.y];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `intensity_data_${session.dateLabel.replace(/\s+/g, "_")}_${session.timeLabel.replace(/[: ]/g, "_")}.csv`;
  link.click();
  

};
