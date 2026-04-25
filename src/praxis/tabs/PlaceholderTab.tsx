export function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="animate-praxis-fade" style={{ background: "#0a1628", border: "1px dashed #1a2f50", padding: 32 }}>
      <div className="font-mono" style={{ fontSize: 10, color: "#2a4060", letterSpacing: "0.2em" }}>
        {name} · MODULE
      </div>
      <div className="font-mono mt-2" style={{ fontSize: 13, color: "#5a7a9a" }}>
        Detailed component pending in upcoming credit drop.
      </div>
      <div className="font-mono mt-6" style={{ fontSize: 9, color: "#2a4060" }}>
        Data has been received and is ready to render once the module ships.
      </div>
    </div>
  );
}