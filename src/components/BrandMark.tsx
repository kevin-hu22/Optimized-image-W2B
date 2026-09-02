/**
 * Marca del producto: [W2B] Optimizer.
 *
 * Es tipografica a proposito — cuando exista un archivo de logo, se reemplaza
 * solo el cuadro por la imagen y todo lo demas queda igual. Misma forma que la
 * marca del CRM y de Tasks, para que las tres se lean como una familia.
 */
export default function BrandMark({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#4948E8] text-[10px] font-extrabold leading-none tracking-tight text-white"
      >
        W2B
      </span>
      {showWordmark && (
        <h1 className="text-xl font-bold tracking-tight">Optimizer</h1>
      )}
      <span className="sr-only">W2B Optimizer</span>
    </span>
  );
}
