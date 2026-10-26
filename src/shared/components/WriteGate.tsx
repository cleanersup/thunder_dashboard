/**
 * @module WriteGate
 * Router-level safety net for create/edit routes.
 *
 * The buttons that open a create/edit form already check the plan, but these
 * routes are also reachable by deep link, a pasted URL or browser history.
 * `WriteGate` re-checks and bounces the user without mounting the form.
 */
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUpgradeGate } from "@/features/subscriptions/context/UpgradeGateContext";
import { useSubscriptionAccess } from "@/shared/hooks/useSubscriptionAccess";
import { matchWriteFeature } from "@/shared/config/writeFeatures";

export function WriteGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useSubscriptionAccess();
  const { canUseFeature, openUpgrade } = useUpgradeGate();
  const bouncedFrom = useRef<string | null>(null);

  const feature = matchWriteFeature(location.pathname);
  const denied = !isLoading && feature !== null && !canUseFeature(feature);

  useEffect(() => {
    if (!denied || !feature) return;
    // Un solo rebote por ruta, para no reabrir el diálogo en cada render.
    if (bouncedFrom.current === location.pathname) return;
    bouncedFrom.current = location.pathname;

    openUpgrade(feature);
    // Un deep link puede no tener historial: ahí no hay "atrás" al que volver.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home", { replace: true });
    }
  }, [denied, feature, location.pathname, navigate, openUpgrade]);

  useEffect(() => {
    if (!denied) bouncedFrom.current = null;
  }, [denied]);

  // Esperamos a saber el plan antes de montar el formulario: si renderizáramos
  // los children durante la carga, un wizard se montaría para desaparecer un
  // instante después.
  if (isLoading && feature !== null) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (denied) return null;

  return <>{children}</>;
}
