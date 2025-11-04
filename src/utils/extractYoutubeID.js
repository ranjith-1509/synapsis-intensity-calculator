const extractYouTubeId = (url) => {
    try {
      const u = new URL(url);
  
      // Case 1: youtu.be short links
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        return id && id.length === 11 ? id : null;
      }
  
      // Case 2: Standard YouTube watch links (?v=...)
      const vParam = u.searchParams.get("v");
      if (vParam && vParam.length === 11) return vParam;
  
      // Case 3: Embed or video paths (/embed/VIDEO_ID or /v/VIDEO_ID)
      const segments = u.pathname.split("/").filter(Boolean);
      const idx = segments.findIndex((p) => p === "embed" || p === "v");
      if (idx !== -1 && segments[idx + 1]) {
        const id = segments[idx + 1];
        return id && id.length === 11 ? id : null;
      }
  
      // ✅ Case 4: Shorts links (/shorts/VIDEO_ID)
      const shortsIdx = segments.findIndex((p) => p === "shorts");
      if (shortsIdx !== -1 && segments[shortsIdx + 1]) {
        const id = segments[shortsIdx + 1];
        return id && id.length === 11 ? id : null;
      }
  
      return null;
    } catch {
      return null;
    }
  };
  export default extractYouTubeId;