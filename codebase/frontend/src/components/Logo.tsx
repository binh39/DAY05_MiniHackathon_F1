import vlearnMark from "../assets/vlearn-vinuni-mark.svg";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img className="brand-mark" src={vlearnMark} alt="" aria-hidden="true" />
      <span className="brand-name">VLearn</span>
      {!compact && <span className="brand-product">AI Lecture Studio</span>}
    </div>
  );
}
