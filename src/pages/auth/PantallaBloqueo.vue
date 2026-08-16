<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useSesionStore } from '@/stores/sesion'
import { ErrorDominio } from '@/lib/errorDominio'
import TecladoPin from '@/components/auth/TecladoPin.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'

const sesion = useSesionStore()
const route = useRoute()
const router = useRouter()

const error = ref('')
const cargando = ref(false)
const bloqueadoPorIntentos = ref(false)
const refTeclado = ref<InstanceType<typeof TecladoPin> | null>(null)

async function alCompletarPin(pin: string): Promise<void> {
  error.value = ''
  cargando.value = true
  try {
    await sesion.desbloquear(pin)
    const destino = typeof route.query.destino === 'string' ? route.query.destino : '/'
    await router.replace(destino)
  } catch (err) {
    if (err instanceof ErrorDominio && err.codigo === 'auth.pin_bloqueado') {
      error.value = err.message
      bloqueadoPorIntentos.value = true
    } else {
      error.value = 'PIN incorrecto. Intenta otra vez.'
      refTeclado.value?.limpiar()
    }
  } finally {
    cargando.value = false
  }
}

async function cerrarSesion(): Promise<void> {
  await sesion.cerrar()
  await router.replace('/ingresar')
}
</script>

<template>
  <div class="mm-bloqueo">
    <h1 class="mm-bloqueo__titulo">Pantalla bloqueada</h1>
    <p v-if="sesion.perfil" class="mm-bloqueo__ayuda">
      Hola, {{ sesion.perfil.nombre }}. Escribe tu PIN para continuar.
    </p>

    <TecladoPin
      ref="refTeclado"
      :deshabilitado="cargando || bloqueadoPorIntentos"
      @completar="alCompletarPin"
    />

    <p v-if="error" class="mm-bloqueo__error" role="alert">{{ error }}</p>

    <BotonSecundario class="mm-bloqueo__salir" @click="cerrarSesion">
      Cerrar sesión
    </BotonSecundario>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-bloqueo {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
  text-align: center;
}

.mm-bloqueo__titulo {
  font-weight: v.$peso-negrita;
  font-size: 24px;
  margin: 0;
}

.mm-bloqueo__ayuda {
  color: v.$tenue;
  margin: 0;
}

.mm-bloqueo__error {
  color: v.$error;
  margin: 0;
}

.mm-bloqueo__salir {
  margin-top: 12px;
}
</style>
