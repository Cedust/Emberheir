import { useRef, useState } from "react";
import { Button, HoldButton } from "../ui/kit/Button";
import { type Backup, BackupError, exportBackup, importBackup, readBackup } from "./saves";

/**
 * Backup (Release 1.0) under the title's Characters: every Heir of this browser in one sealed file,
 * and loading such a file back (it replaces every Heir here, so it asks first).
 */
export function BackupPanel() {
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const download = () => {
    const text = exportBackup();
    if (text === null) {
      setProblem("This browser does not keep save games.");
      return;
    }
    const day = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(new Blob([text], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `emberheir-${day}.ember`;
    a.click();
    URL.revokeObjectURL(url);
    setProblem(null);
  };

  const choose = async (picked: File | undefined) => {
    if (!picked) return;
    try {
      setPending(readBackup(await picked.text()));
      setProblem(null);
    } catch (e) {
      setPending(null);
      setProblem(e instanceof BackupError ? e.message : "This file could not be read.");
    }
    if (file.current) file.current.value = "";
  };

  const heirs = pending
    ? Object.keys(pending.saves).filter((name) => name.startsWith("slot.")).length
    : 0;

  return (
    <div className="backup-panel">
      <div className="backup-row">
        <span className="title-font">Save Files</span>
        <span className="backup-buttons">
          <Button icon="box" onClick={download}>
            Export
          </Button>
          <Button icon="inventory" onClick={() => file.current?.click()}>
            Import
          </Button>
        </span>
      </div>
      <input
        ref={file}
        type="file"
        accept=".ember"
        hidden
        aria-label="Backup file"
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      {pending && (
        <div className="delete-confirm panel-card" role="alertdialog" aria-label="Import">
          <span>
            Replace every Heir here with {heirs} {heirs === 1 ? "Heir" : "Heirs"} from the file?
          </span>
          <Button onClick={() => setPending(null)}>Keep</Button>
          <HoldButton
            icon="inventory"
            onConfirm={() => {
              importBackup(pending);
              window.location.reload();
            }}
          >
            Replace
          </HoldButton>
        </div>
      )}
      {problem && (
        <p className="backup-problem" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
