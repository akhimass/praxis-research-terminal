export function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="animate-praxis-fade" style={{ background: "#0a0a0a", border: "1px dashed #262626", padding: 32 }}>
      <div className="font-mono" style={{ fontSize: 10, color: "#404040", letterSpacing: "0.2em" }}>
        {name} · MODULE
      </div>
      <div className="font-mono mt-2" style={{ fontSize: 13, color: "#a1a1a1" }}>
        Detailed component pending in upcoming credit drop.
      </div>
      <div className="font-mono mt-6" style={{ fontSize: 9, color: "#404040" }}>
        Data has been received and is ready to render once the module ships.
      </div>
    </div>
  );
}