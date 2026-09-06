import { renderNatoSymbol } from "../lib/symbols";
import type { Affiliation, UnitSize } from "../types";

type Props = {
  definitionId: string;
  affiliation: Affiliation;
  unitSize: UnitSize;
  size?: number;
};

export function NatoSymbol({ definitionId, affiliation, unitSize, size = 30 }: Props) {
  const rendered = renderNatoSymbol({ definitionId, affiliation, unitSize }, size);
  if (!rendered) return null;

  return (
    <img
      className="nato-symbol-preview"
      src={rendered.dataUrl}
      alt=""
      draggable={false}
    />
  );
}
