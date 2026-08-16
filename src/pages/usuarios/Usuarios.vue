<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  cambiarRol,
  crearUsuario,
  desactivarUsuario,
  listarUsuarios,
} from '@/services/usuariosService'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import { esCorreoValido } from '@/lib/validacion'
import type { Perfil, RolUsuario } from '@/types/dominio'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import ModalBase from '@/components/ui/ModalBase.vue'

const usuarios = ref<Perfil[]>([])
const cargando = ref(true)
const modalAbierto = ref(false)
const creando = ref(false)
const error = ref('')

const nombreNuevo = ref('')
const correoNuevo = ref('')
const rolNuevo = ref<RolUsuario>('mostrador')

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    usuarios.value = await listarUsuarios()
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cargar la lista.')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function abrirModal(): void {
  nombreNuevo.value = ''
  correoNuevo.value = ''
  rolNuevo.value = 'mostrador'
  error.value = ''
  modalAbierto.value = true
}

async function confirmarCreacion(): Promise<void> {
  error.value = ''
  if (!nombreNuevo.value || !correoNuevo.value) {
    error.value = 'Ingresa nombre y correo.'
    return
  }
  if (!esCorreoValido(correoNuevo.value)) {
    error.value = 'El correo no tiene un formato válido.'
    return
  }

  creando.value = true
  try {
    await crearUsuario({
      nombre: nombreNuevo.value,
      email: correoNuevo.value,
      rol: rolNuevo.value,
    })
    modalAbierto.value = false
    notificar('Usuario creado')
    await cargar()
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo crear el usuario.'
  } finally {
    creando.value = false
  }
}

async function alternarRol(usuario: Perfil): Promise<void> {
  const nuevoRol: RolUsuario = usuario.rol === 'dueno' ? 'mostrador' : 'dueno'
  try {
    await cambiarRol(usuario.id, nuevoRol)
    await cargar()
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cambiar el rol.')
  }
}

async function desactivar(usuario: Perfil): Promise<void> {
  try {
    await desactivarUsuario(usuario.id)
    await cargar()
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo desactivar.')
  }
}
</script>

<template>
  <div class="mm-usuarios">
    <div class="mm-usuarios__cabecera">
      <BotonPrimario @click="abrirModal">Nuevo usuario</BotonPrimario>
    </div>

    <EstadoVacio
      v-if="!cargando && usuarios.length === 0"
      titulo="Todavía no hay usuarios"
    />

    <table v-else-if="!cargando" class="mm-usuarios__tabla">
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">Rol</th>
          <th scope="col">Estado</th>
          <th scope="col"><span class="visually-hidden">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="usuario in usuarios" :key="usuario.id">
          <td>{{ usuario.nombre }}</td>
          <td>{{ usuario.rol === 'dueno' ? 'Dueño' : 'Mostrador' }}</td>
          <td>{{ usuario.activo ? 'Activo' : 'Inactivo' }}</td>
          <td class="mm-usuarios__acciones">
            <BotonSecundario @click="alternarRol(usuario)">
              Hacer {{ usuario.rol === 'dueno' ? 'mostrador' : 'dueño' }}
            </BotonSecundario>
            <BotonSecundario v-if="usuario.activo" @click="desactivar(usuario)">
              Desactivar
            </BotonSecundario>
          </td>
        </tr>
      </tbody>
    </table>

    <ModalBase v-if="modalAbierto" titulo="Nuevo usuario" @cerrar="modalAbierto = false">
      <form class="mm-usuarios__formulario" @submit.prevent="confirmarCreacion">
        <CampoTexto v-model="nombreNuevo" etiqueta="Nombre" />
        <CampoTexto v-model="correoNuevo" etiqueta="Correo" tipo="email" />

        <div class="mm-usuarios__rol">
          <label>
            <input v-model="rolNuevo" type="radio" value="mostrador" />
            Mostrador
          </label>
          <label>
            <input v-model="rolNuevo" type="radio" value="dueno" />
            Dueño
          </label>
        </div>

        <p v-if="error" class="mm-usuarios__error" role="alert">{{ error }}</p>

        <BotonPrimario type="submit" :cargando="creando">Crear</BotonPrimario>
      </form>
    </ModalBase>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-usuarios__cabecera {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.mm-usuarios__tabla {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid v.$borde;
  }
}

.mm-usuarios__acciones {
  display: flex;
  gap: 8px;
}

.mm-usuarios__formulario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-usuarios__rol {
  display: flex;
  gap: 20px;
}

.mm-usuarios__error {
  color: v.$error;
  margin: 0;
}
</style>
