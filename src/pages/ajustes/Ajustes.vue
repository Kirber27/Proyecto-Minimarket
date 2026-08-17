<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useSesionStore } from '@/stores/sesion'
import { useCatalogoStore } from '@/stores/catalogo'
import { definirPin } from '@/services/authService'
import * as inventarioService from '@/services/inventarioService'
import * as arqueoService from '@/services/arqueoService'
import { marcarPinDefinido, tieneModoPinDisponible } from '@/composables/useDispositivo'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import TecladoPin from '@/components/auth/TecladoPin.vue'

const sesion = useSesionStore()
const catalogo = useCatalogoStore()
const router = useRouter()

// Umbral de diferencia del arqueo (requisito 2.6 del spec 09).
const umbralDiferencia = ref<number | null>(1)
const guardandoUmbral = ref(false)

onMounted(async () => {
  if (!sesion.esDueno) return
  try {
    umbralDiferencia.value = await arqueoService.obtenerUmbral(catalogo.negocio)
  } catch {
    // se queda con el valor por defecto si falla
  }
})

async function guardarUmbral(): Promise<void> {
  if (umbralDiferencia.value === null || umbralDiferencia.value < 0) {
    notificar('El umbral debe ser un monto válido.')
    return
  }
  guardandoUmbral.value = true
  try {
    await arqueoService.actualizarUmbral(catalogo.negocio, umbralDiferencia.value)
    notificar('Umbral actualizado')
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo guardar el umbral.')
  } finally {
    guardandoUmbral.value = false
  }
}

const pinListo = ref(tieneModoPinDisponible())

// Diagnostico de reconciliacion de inventario (requisito 4.4, tarea 2.3):
// la suma de movimientos debe cuadrar exactamente con el stock actual.
const verificandoInventario = ref(false)
const descuadres = ref<
  { productoId: string; stockActual: number; sumaMovimientos: number }[] | null
>(null)

async function verificarInventario(): Promise<void> {
  verificandoInventario.value = true
  try {
    descuadres.value = await inventarioService.reconciliar()
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo verificar el inventario.',
    )
  } finally {
    verificandoInventario.value = false
  }
}

const paso = ref<'inicial' | 'ingresar' | 'confirmar'>('inicial')
const primerPin = ref('')
const error = ref('')
const guardando = ref(false)
const refTeclado = ref<InstanceType<typeof TecladoPin> | null>(null)

function empezar(): void {
  paso.value = 'ingresar'
  error.value = ''
}

function alIngresarPrimerPin(pin: string): void {
  primerPin.value = pin
  paso.value = 'confirmar'
  refTeclado.value?.limpiar()
}

async function alConfirmarPin(pin: string): Promise<void> {
  if (pin !== primerPin.value) {
    error.value = 'Los dos PIN no coinciden. Empieza de nuevo.'
    paso.value = 'inicial'
    return
  }

  guardando.value = true
  try {
    await definirPin(pin)
    marcarPinDefinido()
    pinListo.value = true
    notificar('PIN guardado')
    paso.value = 'inicial'
  } catch (err) {
    error.value = err instanceof ErrorDominio ? err.message : 'No se pudo guardar el PIN.'
    paso.value = 'inicial'
  } finally {
    guardando.value = false
  }
}

async function bloquear(): Promise<void> {
  sesion.bloquear()
  await router.replace('/bloqueado')
}

async function cerrarSesion(): Promise<void> {
  await sesion.cerrar()
  await router.replace('/ingresar')
}
</script>

<template>
  <div class="mm-ajustes">
    <section class="mm-ajustes__seccion">
      <h2 class="mm-ajustes__titulo">PIN de acceso</h2>
      <p class="mm-ajustes__ayuda">
        El PIN bloquea la pantalla sin cerrar tu sesión, para dejar el mostrador un
        momento sin que cualquiera pueda vender o ver reportes.
      </p>

      <p v-if="error" class="mm-ajustes__error" role="alert">{{ error }}</p>

      <div v-if="paso === 'inicial'" class="mm-ajustes__acciones-pin">
        <BotonSecundario @click="empezar">
          {{ pinListo ? 'Cambiar PIN' : 'Definir PIN' }}
        </BotonSecundario>
        <BotonSecundario v-if="pinListo" @click="bloquear"
          >Bloquear ahora</BotonSecundario
        >
      </div>

      <div v-else class="mm-ajustes__pin">
        <p class="mm-ajustes__pin-ayuda">
          {{ paso === 'ingresar' ? 'Escribe un PIN de 4 dígitos' : 'Confirma el PIN' }}
        </p>
        <TecladoPin
          ref="refTeclado"
          :deshabilitado="guardando"
          @completar="
            paso === 'ingresar' ? alIngresarPrimerPin($event) : alConfirmarPin($event)
          "
        />
      </div>
    </section>

    <section v-if="sesion.esDueno" class="mm-ajustes__seccion">
      <h2 class="mm-ajustes__titulo">Usuarios</h2>
      <p class="mm-ajustes__ayuda">Cuentas del dueño y del mostrador.</p>
      <RouterLink to="/usuarios" class="mm-ajustes__enlace"
        >Administrar usuarios</RouterLink
      >
    </section>

    <section v-if="sesion.esDueno" class="mm-ajustes__seccion">
      <h2 class="mm-ajustes__titulo">Inventario</h2>
      <p class="mm-ajustes__ayuda">
        Verifica que el stock de cada producto cuadre con la suma de sus movimientos.
      </p>
      <BotonSecundario :cargando="verificandoInventario" @click="verificarInventario">
        Verificar inventario
      </BotonSecundario>

      <p v-if="descuadres?.length === 0" class="mm-ajustes__ok">
        Todo cuadra: el stock de cada producto coincide con sus movimientos.
      </p>
      <ul v-else-if="descuadres && descuadres.length > 0" class="mm-ajustes__descuadres">
        <li v-for="d in descuadres" :key="d.productoId">
          Producto {{ d.productoId }}: stock {{ d.stockActual }}, movimientos suman
          {{ d.sumaMovimientos }}
        </li>
      </ul>
    </section>

    <section v-if="sesion.esDueno" class="mm-ajustes__seccion">
      <h2 class="mm-ajustes__titulo">Arqueo de caja</h2>
      <p class="mm-ajustes__ayuda">
        Diferencia a partir de la cual el cierre de caja exige escribir una nota.
      </p>
      <CampoNumero
        v-model="umbralDiferencia"
        etiqueta="Umbral (USD)"
        :step="0.5"
        :min="0"
      />
      <BotonSecundario :cargando="guardandoUmbral" @click="guardarUmbral">
        Guardar umbral
      </BotonSecundario>
    </section>

    <section class="mm-ajustes__seccion">
      <BotonSecundario @click="cerrarSesion">Cerrar sesión</BotonSecundario>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-ajustes {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.mm-ajustes__seccion {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 24px;
  border-bottom: 1px solid v.$borde;
}

.mm-ajustes__titulo {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-negrita;
  margin: 0;
}

.mm-ajustes__ayuda {
  color: v.$tenue;
  margin: 0;
  max-width: 48ch;
}

.mm-ajustes__error {
  color: v.$error;
  margin: 0;
}

.mm-ajustes__acciones-pin {
  display: flex;
  gap: 12px;
}

.mm-ajustes__pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.mm-ajustes__pin-ayuda {
  color: v.$tenue;
  margin: 0;
}

.mm-ajustes__ok {
  color: v.$ok;
  font-weight: v.$peso-semi;
  margin: 0;
}

.mm-ajustes__descuadres {
  color: v.$error;
  font-size: v.$tam-etiqueta;
  margin: 0;
  padding-left: 20px;
}

.mm-ajustes__enlace {
  color: v.$acento-hover;
  font-weight: v.$peso-semi;
  text-decoration: none;
}
</style>
