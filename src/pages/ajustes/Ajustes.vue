<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useSesionStore } from '@/stores/sesion'
import { definirPin } from '@/services/authService'
import { marcarPinDefinido, tieneModoPinDisponible } from '@/composables/useDispositivo'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import TecladoPin from '@/components/auth/TecladoPin.vue'

const sesion = useSesionStore()
const router = useRouter()

const pinListo = ref(tieneModoPinDisponible())

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

.mm-ajustes__enlace {
  color: v.$acento-hover;
  font-weight: v.$peso-semi;
  text-decoration: none;
}
</style>
