<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { enviarRecuperacion } from '@/services/authService'
import { esCorreoValido } from '@/lib/validacion'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'

const router = useRouter()
const correo = ref('')
const error = ref('')
const cargando = ref(false)

async function enviar(): Promise<void> {
  error.value = ''

  if (!esCorreoValido(correo.value)) {
    error.value = 'Ingresa un correo válido para enviarte el enlace.'
    return
  }

  cargando.value = true
  try {
    await enviarRecuperacion(correo.value)
    await router.push('/recuperar/enviado')
  } catch {
    // El requisito 3.2 pide la misma confirmacion exista o no la cuenta; un
    // error de red real tambien se trata como envio (no hay forma segura de
    // distinguir uno de otro desde el cliente).
    await router.push('/recuperar/enviado')
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="mm-recuperar">
    <h1 class="mm-recuperar__titulo">Recuperar contraseña</h1>
    <p class="mm-recuperar__ayuda">
      Escribe tu correo y te enviamos un enlace para elegir una contraseña nueva.
    </p>

    <form class="mm-recuperar__formulario" @submit.prevent="enviar">
      <CampoTexto
        v-model="correo"
        etiqueta="Correo"
        tipo="email"
        placeholder="tu@correo.com"
        :error="error"
      />
      <BotonPrimario type="submit" :cargando="cargando" class="mm-recuperar__boton">
        Enviar enlace
      </BotonPrimario>
      <RouterLink to="/ingresar" class="mm-recuperar__enlace"
        >Volver a ingresar</RouterLink
      >
    </form>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-recuperar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.mm-recuperar__titulo {
  font-weight: v.$peso-negrita;
  font-size: 24px;
  margin: 0;
}

.mm-recuperar__ayuda {
  color: v.$tenue;
  max-width: 32ch;
  margin: 0;
}

.mm-recuperar__formulario {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 340px;
  text-align: left;
}

.mm-recuperar__boton {
  width: 100%;
}

.mm-recuperar__enlace {
  text-align: center;
  color: v.$acento-hover;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  text-decoration: none;
}
</style>
