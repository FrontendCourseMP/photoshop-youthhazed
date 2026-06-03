import { useRef, useState } from "react";
import { useImageDocument } from "./hooks/useImageDocument.js";
import { useImageView } from "./hooks/useImageView.js";
import Toolbar from "./components/Toolbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import CanvasStage from "./components/CanvasStage.jsx";
import StatusBar from "./components/StatusBar.jsx";
import LevelsDialog from "./components/LevelsDialog.jsx";
import ResizeDialog from "./components/ResizeDialog.jsx";

export default function App() {
  const inputRef = useRef(null);
  const { imageData, meta, status, isError, generation, load, clear, save, replaceImage } =
    useImageDocument();
  const view = useImageView(imageData, generation);
  const hasImage = Boolean(imageData);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);

  function openFileDialog() {
    inputRef.current?.click();
  }

  function handleInputChange(event) {
    const [file] = event.target.files;
    if (file) {
      load(file);
    }
    event.target.value = "";
  }

  function applyLevelsResult(nextImageData) {
    view.setPreview(null);
    replaceImage(nextImageData);
    setLevelsOpen(false);
  }

  function applyResizeResult(nextImageData) {
    replaceImage(nextImageData);
    setResizeOpen(false);
  }

  return (
    <div className="app">
      <input
        ref={inputRef}
        className="hidden-input"
        type="file"
        accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg"
        onChange={handleInputChange}
      />

      <Toolbar hasImage={hasImage} onOpen={openFileDialog} onSave={save} onClose={clear} />

      <main className="workspace">
        <Sidebar
          meta={meta}
          modeLabel={view.modeLabel}
          hasImage={hasImage}
          sourceImageData={imageData}
          activeTool={view.activeTool}
          onSelectTool={view.selectTool}
          zoom={view.zoom}
          onZoom={view.changeZoom}
          onFit={view.fitToView}
          descriptors={view.descriptors}
          channels={view.channels}
          onToggleChannel={view.toggleChannel}
          onOpenLevels={() => setLevelsOpen(true)}
          onOpenResize={() => setResizeOpen(true)}
        />

        <CanvasStage
          stageRef={view.stageRef}
          hasImage={hasImage}
          sourceImageData={imageData}
          visibleImageData={view.visibleImageData}
          zoom={view.zoom}
          activeTool={view.activeTool}
          onDropFile={load}
          onPick={view.setPixel}
        />
      </main>

      <StatusBar
        status={status}
        isError={isError}
        hasImage={hasImage}
        meta={meta}
        activeTool={view.activeTool}
        pixel={view.pixel}
      />

      <LevelsDialog
        open={levelsOpen}
        source={imageData}
        onPreview={view.setPreview}
        onApply={applyLevelsResult}
        onClose={() => setLevelsOpen(false)}
      />

      <ResizeDialog
        open={resizeOpen}
        source={imageData}
        onApply={applyResizeResult}
        onClose={() => setResizeOpen(false)}
      />
    </div>
  );
}
