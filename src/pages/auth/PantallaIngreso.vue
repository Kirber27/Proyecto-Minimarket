<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useSesionStore } from '@/stores/sesion'
import { ErrorDominio } from '@/lib/errorDominio'
import { esCorreoValido } from '@/lib/validacion'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'

const sesion = useSesionStore()
const route = useRoute()
const router = useRouter()

const correo = ref('')
const contrasena = ref('')
const recordarme = ref(true)
const mostrarContrasena = ref(false)
const cargando = ref(false)
const error = ref('')

const idContrasena = useId()

const tipoContrasena = computed(() => (mostrarContrasena.value ? 'text' : 'password'))

onMounted(async () => {
  await sesion.esperarInicializacion()
  if (sesion.autenticado) {
    await irADestino()
  }
})

async function irADestino(): Promise<void> {
  const destino = typeof route.query.destino === 'string' ? route.query.destino : '/'
  await router.replace(destino)
}

async function ingresarConPassword(): Promise<void> {
  error.value = ''

  if (!correo.value || !contrasena.value) {
    error.value = 'Ingresa tu correo y contraseña.'
    return
  }
  if (!esCorreoValido(correo.value)) {
    error.value = 'El correo no tiene un formato válido.'
    return
  }

  cargando.value = true
  try {
    await sesion.iniciarConPassword(correo.value, contrasena.value, recordarme.value)
    await irADestino()
  } catch (err) {
    error.value =
      err instanceof ErrorDominio
        ? err.message
        : 'No se pudo iniciar sesión. Intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="mm-ingreso">
    <h1 class="mm-ingreso__marca">Minimarket</h1>

    <form class="mm-ingreso__formulario" @submit.prevent="ingresarConPassword">
      <CampoTexto
        v-model="correo"
        etiqueta="Correo"
        tipo="email"
        placeholder="tu@correo.com"
      />

      <div class="mm-campo">
        <label :for="idContrasena" class="mm-ingreso__etiqueta">Contraseña</label>
        <div class="mm-ingreso__contrasena">
          <input
            :id="idContrasena"
            v-model="contrasena"
            :type="tipoContrasena"
            class="mm-ingreso__contrasena-input"
          />
          <button
            type="button"
            class="mm-ingreso__alternar"
            :aria-label="mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="mostrarContrasena = !mostrarContrasena"
          >
            {{ mostrarContrasena ? 'Ocultar' : 'Mostrar' }}
          </button>
        </div>
      </div>

      <label class="mm-ingreso__recordarme">
        <input v-model="recordarme" type="checkbox" />
        Recordarme
      </label>

      <p v-if="error" class="mm-ingreso__error" role="alert">{{ error }}</p>

      <BotonPrimario type="submit" :cargando="cargando" class="mm-ingreso__boton">
        Ingresar
      </BotonPrimario>

      <RouterLink to="/recuperar" class="mm-ingreso__enlace">
        ¿Olvidaste tu contraseña?
      </RouterLink>
    </form>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-ingreso {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
}

.mm-ingreso__marca {
  font-weight: v.$peso-extra;
  font-size: 28px;
  margin: 0;
}

.mm-ingreso__formulario {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 340px;
}

.mm-campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-ingreso__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-ingreso__contrasena {
  display: flex;
  align-items: center;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
}

.mm-ingreso__contrasena-input {
  flex: 1;
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: none;
  background: transparent;
  font-size: v.$tam-cuerpo;

  &:focus {
    outline: none;
  }
}

.mm-ingreso__alternar {
  background: none;
  border: none;
  color: v.$acento-hover;
  font-weight: v.$peso-semi;
  font-size: v.$tam-etiqueta;
  padding: 0 14px;
  min-height: v.$objetivo-tactil-min;
  cursor: pointer;
}

.mm-ingreso__recordarme {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: v.$tam-cuerpo;
  color: v.$tenue;
}

.mm-ingreso__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}

.mm-ingreso__boton {
  width: 100%;
}

.mm-ingreso__enlace {
  text-align: center;
  color: v.$acento-hover;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  text-decoration: none;
}
</style>
