# Mutator Tuning DB Rollout Checklist

## Objetivo

Migrar de fallback en `AuditLog` a almacenamiento primario en tablas dedicadas para tuning de mutadores.

---

## Orden recomendado (obligatorio)

1. **Aplicar migración Prisma**
   - Ejecutar `prisma migrate deploy` en entorno objetivo.
   - Verificar existencia de tablas:
     - `MutatorTuningOverride`
     - `MutatorTuningHistory`

2. **Backfill / coherencia inicial (si aplica)**
   - Revisar en `/ops` historial de ajustes y validar que los datos recientes aparezcan.
   - Ejecutar al menos 1 dry-run + 1 apply en entorno controlado.

3. **Activar modo primario por flag**
   - Setear `FEATURE_MUTATOR_TUNING_DB_PRIMARY=true`.
   - Revalidar `/ops` y confirmar `Mutator tuning source: TABLE PRIMARY`.

4. **Smoke test funcional**
   - Apply sobre un mutador.
   - Iniciar run nueva y validar snapshot con `runMutatorProfile` aplicado.
   - Rollback y validar que nuevas runs vuelvan a perfil neutral.

5. **Monitoreo post-rollout (24h)**
   - Revisar errores de acciones Ops.
   - Revisar historial en ventana 24h para confirmar trazabilidad.

---

## Criterios Go/No-Go

### Go
- `/ops` muestra `TABLE PRIMARY`.
- Apply + rollback funcionan y quedan en historial.
- No hay errores críticos en acciones admin de mutador.

### No-Go
- Tablas no existen o fallan operaciones CRUD.
- `/ops` queda en fallback pese a flag activa por error operativo.
- Apply rompe el flujo de inicio de run.

---

## Plan de reversión rápida

1. Setear `FEATURE_MUTATOR_TUNING_DB_PRIMARY=false`.
2. Mantener acciones disponibles con fallback en `AuditLog`.
3. Investigar causa y repetir rollout en ventana controlada.
