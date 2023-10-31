(window as any).parentMessages = {};
if (window.location.protocol === "blob:") {
    window.parent.postMessage("AuthToken");
    window.addEventListener("message", (event) => {
        let parentMessages = (window as any).parentMessages;
        parentMessages = { ...parentMessages, ...event.data };
        (window as any).parentMessages = parentMessages;
    });
}