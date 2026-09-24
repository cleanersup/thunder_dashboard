# ThunderPro — Expansión B2B
### De herramienta individual a plataforma multi-empresa

---

## 1. Resumen Ejecutivo

**¿Qué tenemos hoy?**
ThunderPro es una plataforma web + app móvil funcional y en producción, diseñada para trabajadores independientes del sector servicios (limpieza, mantenimiento, etc.). Gestiona estimados, facturas, clientes, empleados y rutas.

**¿Cuál es la oportunidad?**
El mismo producto, con ajustes de arquitectura, puede servir a empresas completas — con múltiples empleados, roles diferenciados y su propia marca en documentos. Este es el paso natural de cualquier SaaS exitoso: de usuario individual a empresa.

**¿Por qué ahora?**
Porque ya tenemos el producto. No partimos de cero. La base técnica está hecha — lo que falta es habilitarla para múltiples usuarios bajo una misma organización.

---

## 2. Estado Actual

| Componente | Estado |
|---|---|
| Web Dashboard (dashboard.thunderpro.co) | ✅ En producción |
| App Móvil iOS & Android (Swift-Slate) | ✅ En producción |
| Estimados y Facturas | ✅ Funcional |
| CRM & Clientes | ✅ Funcional |
| Rutas & Scheduling | ✅ Funcional |
| Time Clock | ✅ Funcional |
| Suscripciones individuales (RevenueCat + Stripe) | ✅ Funcional |
| Multi-empresa / Roles / Permisos | ❌ No existe aún |
| Panel de administración ThunderPro | ❌ No existe aún |
| Suscripciones B2B (Stripe Billing web) | ❌ No existe aún |

**Planes actuales (usuarios individuales):**

| Plan | Mensual | Anual | Funcionalidades clave |
|---|---|---|---|
| Basic | $29/mo | $290/año | Estimados, Facturas, CRM, Empleados |
| Essential | $79/mo | $790/año | + Rutas, Scheduling, Booking |
| Professional | $129/mo | $1,290/año | + Smart Map, Time Clock, Empleados ilimitados |

---

## 3. La Oportunidad B2B

### El problema que resolvemos

Las pequeñas y medianas empresas de servicios (limpieza, jardinería, plomería, HVAC, pest control, etc.) necesitan exactamente lo que ya hace ThunderPro — pero no para una sola persona, sino para un equipo de 3 a 30 personas. Hoy usan Excel, WhatsApp y papel.

### El mercado

- En EE.UU. existen más de **1.2 millones** de empresas de servicios del hogar con menos de 20 empleados.
- Herramientas líderes como **Jobber** ($69–$199/mo) y **HouseCall Pro** ($65–$169/mo) dominan el mercado anglohablante.
- En el mercado hispanohablante (LATAM + US Hispanic) la penetración de software especializado es mucho menor — **ahí está la oportunidad real**.

### ¿Por qué ThunderPro puede competir?

1. Ya tenemos el producto funcionando — ventaja de tiempo sobre construir desde cero
2. UX en español como primera clase, no como traducción
3. Precios accesibles para mercado LATAM
4. App móvil nativa incluida en el plan

---

## 4. La Solución: ThunderPro Multi-Empresa

### Concepto central

> Una sola plataforma donde cada empresa opera en su propio espacio aislado, con su logo, sus servicios, sus precios y su equipo. El dueño ve todo. El manager gestiona. El empleado ve solo lo suyo.

### Cómo funciona para el usuario final

```
1. La empresa entra a dashboard.thunderpro.co
2. Se registra y elige su plan
3. Configura su empresa (logo, servicios, tarifas)
4. Invita a su equipo con roles asignados
5. Opera exactamente igual que hoy — pero en equipo
```

### Roles dentro de cada empresa

| Rol | Qué puede hacer |
|---|---|
| **Owner** | Todo: configuración, billing, empleados, reportes, clientes, facturas |
| **Manager** | Clientes, estimados, facturas, empleados — sin acceso a billing |
| **Employee** | Sus rutas asignadas, clock in/out, su agenda del día |

### Multi-empresa para un mismo usuario

Un dueño que tiene dos negocios (ej: jardinería y plomería) usa el mismo login y cambia de empresa con un selector en el header — sin cerrar sesión. Cada empresa paga su propia suscripción.

---

## 5. Arquitectura del Sistema

### Vista general

```
thunderpro.co
     │
     ├── Web Dashboard ──────────────────────────────────────┐
     │   ├── Usuario Individual (actual)                     │
     │   └── Empresa (multi-tenant)                          │
     │                                                        │
     ├── App Móvil (iOS & Android)  ──────────────────────── ┼──► SUPABASE
     │   ├── Usuario Individual                               │    · Auth
     │   └── Empresa (empleados en campo)                    │    · Database
     │                                                        │    · Storage
     └── ThunderPro Admin Panel ────────────────────────────┘    · Edge Functions
         └── Gestión de todas las cuentas                        · Realtime
                                                                      │
                                                              ┌───────┴───────┐
                                                         REVENUECAT        STRIPE
                                                         (mobile subs)  (web B2B)
```

### Aislamiento de datos en Supabase

Cada empresa tiene su propio espacio de datos. Una empresa nunca puede ver los datos de otra. Esto se implementa con `company_id` en todas las tablas y políticas RLS (Row Level Security) de Supabase.

```
SUPABASE
│
├── Companías
│   ├── Carlos (usuario individual)   → Plan Basic $29/mo
│   ├── Verde Jardines (empresa)      → Plan B2B Starter $149/mo
│   ├── Plomería Rápida (empresa)     → Plan B2B Starter $149/mo
│   └── Limpieza Express (empresa)    → Plan B2B Pro $299/mo
│
├── Auth.users (un login por persona)
│   ├── carlos@email.com → 1 empresa
│   ├── juan@verde.com   → 1 empresa
│   └── diego@email.com  → 2 empresas (selector al login)
│
└── Subscriptions
    ├── Carlos          → Basic        $29/mo
    ├── Verde Jardines  → B2B Starter  $149/mo
    ├── Plomería Rápida → B2B Starter  $149/mo
    └── Diego (x2)      → B2B Pro      $299/mo + $269/mo (10% descuento 2da empresa)
```

---

## 6. Modelo de Precios Propuesto

### Planes B2B (nuevos)

| Criterio | B2B Starter | B2B Pro | B2B Enterprise |
|---|---|---|---|
| **Precio mensual** | **$149/mo** | **$299/mo** | A consultar |
| **Precio anual** | $1,490/año | $2,990/año | A consultar |
| **Ahorro anual** | ~17% | ~17% | — |
| **Usuarios incluidos** | Hasta 5 | Hasta 15 | Ilimitados |
| **Clientes** | Ilimitados | Ilimitados | Ilimitados |
| **Estimados & Facturas** | ✅ | ✅ | ✅ |
| **CRM** | ✅ | ✅ | ✅ |
| **Rutas & Scheduling** | ✅ | ✅ | ✅ |
| **Smart Map & Tracking** | ❌ | ✅ | ✅ |
| **Time Clock** | ❌ | ✅ | ✅ |
| **Logo en PDFs** | ✅ | ✅ | ✅ |
| **Roles y permisos** | ✅ | ✅ | ✅ |
| **App móvil empleados** | ✅ | ✅ | ✅ |
| **Catálogo de servicios propio** | ✅ | ✅ | ✅ |
| **Usuario adicional** | +$20/usuario | +$15/usuario | incluido |
| **Soporte** | Email | Chat prioritario | SLA dedicado |
| **Onboarding** | Self-service | Asistido | Personalizado |
| **2da empresa (descuento)** | 10% off | 10% off | A negociar |

### Comparación con competencia

| Herramienta | Precio base | Usuarios | Mercado |
|---|---|---|---|
| Jobber | $69–$199/mo | Limitado | EN, sin móvil nativo |
| HouseCall Pro | $65–$169/mo | Limitado | EN |
| ServiceTitan | $200+/mo | Enterprise | EN, complejo |
| **ThunderPro B2B** | **$149–$299/mo** | Hasta 15 | **ES/EN, móvil incluido** |

---

## 7. Flujo de Onboarding

### Fase 1 — Manual (primeras 5–10 empresas)

```
Empresa interesada
       │
       ▼
  Call de discovery (30 min)
  · Industria, tamaño del equipo, flujo actual
       │
       ▼
  ThunderPro crea la cuenta manualmente
  · Configuración inicial de servicios y tarifas
  · Creación de usuario owner
       │
       ▼
  Call de setup con screen share (45 min)
  · El owner aprende a invitar empleados
  · Flujo completo: cliente → estimado → factura
       │
       ▼
  Período de prueba 14–30 días
  · Acompañamiento directo
  · Recolección de feedback
       │
       ▼
  Conversión a pago (Stripe)
```

**Objetivo de la Fase 1:** aprender qué necesita realmente una empresa antes de automatizar.

### Fase 2 — Automatizado (luego de empresa 5–10)

```
Landing page → Registro → Elegir plan → Pagar (Stripe)
       │
       ▼
  Wizard self-service (5 pasos, ~20 min)
  1. Perfil empresa (nombre, logo, dirección)
  2. Servicios y tarifas base
  3. Invitar equipo
  4. Primer cliente
  5. Primer estimado
       │
       ▼
  Dashboard operativo + checklist de primeros pasos
```

---

## 8. Implicaciones de Desarrollo

### Lo que hay que construir (priorizado)

**Fase crítica — sin esto no se puede lanzar:**

| Tarea | Descripción | Complejidad |
|---|---|---|
| `company_id` en schema | Agregar a todas las tablas: clients, invoices, estimates, employees, etc. | Alta |
| Row Level Security | Políticas en Supabase para que cada empresa solo vea sus datos | Alta |
| Roles y permisos | Owner / Manager / Employee con acceso diferenciado | Media |
| Selector de empresa | UI para usuarios con múltiples empresas | Baja |
| Company Settings | Pantalla para configurar logo, servicios, tarifas | Media |
| Stripe Billing web | Suscripciones B2B directas en web (hoy solo existe vía RevenueCat/mobile) | Alta |

**Fase de crecimiento — para escalar:**

| Tarea | Descripción | Complejidad |
|---|---|---|
| Panel Admin ThunderPro | Vista interna de todas las cuentas, métricas, soporte | Media |
| Wizard de onboarding | Flujo guiado al crear una empresa nueva | Media |
| Invitación por email | Owner invita empleados/managers por email | Baja |
| Landing B2B | Página de marketing para empresas en thunderpro.co | Baja |
| Importación de datos | CSV de clientes existentes para facilitar migración | Media |

**Estimado total de desarrollo (referencial):**
- Fase crítica: ~6–8 semanas con 1 desarrollador
- Fase crecimiento: ~4–6 semanas adicionales

---

## 9. Implicaciones de Infraestructura

### Supabase

| Aspecto | Situación actual | Con B2B |
|---|---|---|
| Base de datos | Un solo tenant (per-user) | Multi-tenant con company_id |
| RLS policies | Básicas por user_id | Complejas por company_id + rol |
| Storage | Fotos/archivos por usuario | Logos, PDFs, assets por empresa |
| Auth | Un rol por usuario | Roles por empresa por usuario |
| Plan de Supabase | Revisar límites actuales | Posible upgrade según crecimiento |

### Pagos (dos flujos paralelos)

```
Mobile (actual)     → RevenueCat → App Store / Google Play
Web B2B (nuevo)     → Stripe Billing directo (subscriptions + webhooks)
```

Ambos coexisten. Los usuarios individuales siguen pagando vía app. Las empresas B2B pagan vía web.

### Escalabilidad

- Supabase maneja bien hasta cientos de empresas sin cambios de infraestructura
- El primer punto de revisión real es a partir de ~500 empresas activas
- No se necesita inversión adicional en infraestructura para validar el modelo

---

## 10. Proyección de Ingresos

### Escenario conservador

| Etapa | Empresas activas | Ticket promedio | MRR | ARR |
|---|---|---|---|---|
| Piloto (mes 3) | 5 empresas | $149 | $745 | $8,940 |
| Tracción (mes 6) | 20 empresas | $180 | $3,600 | $43,200 |
| Crecimiento (mes 12) | 50 empresas | $200 | $10,000 | $120,000 |
| Escala (mes 18) | 100 empresas | $220 | $22,000 | $264,000 |

*Estos números son adicionales a los ingresos actuales de usuarios individuales.*

### Comparación individual vs empresa

```
1 empresa B2B Starter ($149/mo) = 5 usuarios individuales Basic ($29 c/u)
1 empresa B2B Pro ($299/mo)     = 4 usuarios individuales Essential ($79 c/u)

Una sola empresa = el equivalente en ingresos de 4–5 usuarios individuales
con el mismo costo de soporte e infraestructura.
```

**El modelo B2B es más eficiente por unidad de esfuerzo.**

---

## 11. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El schema actual no soporta multi-tenant | Alta | Alto | Auditoría técnica antes de comenzar |
| Las empresas piloto no convierten a pago | Media | Medio | Cobrar desde el día 1, aunque sea precio reducido |
| El onboarding es demasiado complejo | Media | Alto | Empezar manual, no lanzar self-service sin validar |
| Competencia reacciona con precios menores | Baja | Medio | Diferencial por idioma, UX y precio LATAM |
| Soporte escala más rápido que el equipo | Media | Medio | Documentación y FAQs desde el primer onboarding |
| Una empresa grande necesita features no planeados | Alta | Bajo | El plan Enterprise cubre esto como negociación directa |

---

## 12. Roadmap Propuesto

```
MES 1–2          MES 3–4              MES 5–6           MES 7+
─────────────────────────────────────────────────────────────────
Auditoría del    Onboarding de        Wizard             Landing B2B
schema actual    3–5 empresas         self-service       pública

Agregar          piloto               Stripe Billing     Panel Admin
company_id       (manual)             web B2B            ThunderPro

Roles y          Company              Invitaciones       Marketing
permisos         Settings             por email          y ventas

Selector         Logo en PDFs
de empresa       por empresa

                 ◄── Aprender ────►   ◄── Escalar ──────────────►
```

---

## 13. Próximos Pasos Recomendados

1. **Auditoría técnica del schema** — verificar si las tablas actuales tienen `user_id` o ya existe un concepto de organización. Define el alcance real del trabajo.

2. **Identificar 3 empresas piloto** — idealmente conocidas, dispuestas a probar y a dar feedback honesto. No necesitan ser clientes pagos desde el inicio, pero deben comprometerse a usar el producto.

3. **Definir el MVP mínimo** — ¿qué tiene que funcionar para que la primera empresa piloto opere en producción? Solo eso, nada más.

4. **Validar el precio** — en el call de discovery con las primeras empresas, preguntar directamente: "¿Pagarías $149/mes por esto?" La respuesta real vale más que cualquier análisis de mercado.

---

## Resumen para decisión

| Pregunta | Respuesta |
|---|---|
| ¿Es viable técnicamente? | Sí — sobre base existente |
| ¿Requiere nueva infraestructura? | No para validar |
| ¿Cuánto tarda en lanzar piloto? | 6–8 semanas |
| ¿Cuánto puede generar? | $10K–$22K MRR a 12–18 meses |
| ¿Qué pasa si no funciona? | El producto individual sigue intacto |
| ¿Qué pasa si funciona? | ThunderPro se convierte en SaaS B2B escalable |

---

*Documento preparado para presentación interna — ThunderPro, marzo 2026*
