<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { actualizarContrasena } from '@/services/authService'
import { ErrorDominio } from '@/lib/errorDominio'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'

const router = useRouter()

const contrasena = ref('')
const confirmacion = ref('')
const error = ref('')
const cargando = ref(false)
const listo = ref(false)

async function guardar(): Promise<void> {
  error.value = ''

  if (contrasena.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (contrasena.value !== confirmacion.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  cargando.value = true
  try {
    await actualizarContrasena(contrasena.value)
    listo.value = true
    setTimeout(() => router.replace('/'), 1500)
  } catch (err) {
    error.value =
      err instanceof ErrorDominio
        ? err.message
        : 'El enlace vencio o ya se uso. Pide uno nuevo.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="mm-restablecer">
    <template v-if="listo">
      <p class="mm-restablecer__titulo">Contraseña actualizada</p>
      <p class="mm-restablecer__ayuda">Ya puedes seguir usando la app.</p>
    </template>

    <form v-else class="mm-restablecer__formulario" @submit.prevent="guardar">
      <h1 class="mm-restablecer__titulo">Elige una contraseña nueva</h1>
      <CampoTexto v-model="contrasena" etiqueta="Contraseña nueva" tipo="password" />
      <CampoTexto
        v-model="confirmacion"
        etiqueta="Confirmar contraseña"
        tipo="password"
        :error="error"
      />
      <BotonPrimario type="submit" :cargando="cargando" class="mm-restablecer__boton">
        Guardar
      </BotonPrimario>
    </form>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-restablecer {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.mm-restablecer__titulo {
  font-weight: v.$peso-negrita;
  font-size: 24px;
  margin: 0;
}

.mm-restablecer__ayuda {
  color: v.$tenue;
  margin: 0;
}

.mm-restablecer__formulario {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 340px;
  text-align: left;
}

.mm-restablecer__boton {
  width: 100%;
}
</style>
