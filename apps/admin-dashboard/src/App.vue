<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const registrations = ref([])
const authState = ref('checking')
const currentUsername = ref('')
const username = ref('')
const password = ref('')
const loginError = ref('')
const isLoggingIn = ref(false)
const isLoggingOut = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const searchQuery = ref('')
const deletingRegistrationId = ref(null)
const editingRegistrationId = ref(null)
const isSavingEdit = ref(false)
const editError = ref('')
const summary = reactive({
  total: 0,
  total5K: 0,
  total10K: 0
})
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1
})
const editForm = reactive({
  name: '',
  email: '',
  phone: '',
  gender: '',
  birth_date: '',
  address: '',
  race_category: '',
  shirt_size: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  medical_condition: ''
})

let searchTimer
let latestLoadRequest = 0

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(`${value.replace(' ', 'T')}Z`))
}

function resetToLogin(message = '') {
  authState.value = 'unauthenticated'
  currentUsername.value = ''
  password.value = ''
  registrations.value = []
  searchQuery.value = ''
  Object.assign(summary, { total: 0, total5K: 0, total10K: 0 })
  Object.assign(pagination, { page: 1, pageSize: 10, total: 0, totalPages: 1 })
  errorMessage.value = ''
  actionMessage.value = ''
  loginError.value = message
}

async function loadRegistrations() {
  const requestId = ++latestLoadRequest
  isLoading.value = true
  errorMessage.value = ''

  try {
    const query = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.pageSize)
    })

    if (searchQuery.value.trim()) {
      query.set('search', searchQuery.value.trim())
    }

    const response = await fetch(`${apiUrl}/api/registrations?${query}`, {
      credentials: 'include'
    })

    if (response.status === 401) {
      resetToLogin('Sesi admin telah berakhir. Silakan login kembali.')
      return
    }

    if (!response.ok) throw new Error('Gagal mengambil data peserta')

    const body = await response.json()
    if (requestId !== latestLoadRequest) return

    registrations.value = body.data
    Object.assign(pagination, body.pagination)
    Object.assign(summary, body.summary)
  } catch {
    if (requestId === latestLoadRequest) {
      errorMessage.value = 'Data peserta belum dapat dimuat. Pastikan backend sedang berjalan.'
    }
  } finally {
    if (requestId === latestLoadRequest) {
      isLoading.value = false
    }
  }
}

async function goToPage(page) {
  if (page < 1 || page > pagination.totalPages || page === pagination.page) return

  pagination.page = page
  await loadRegistrations()
}

function openEdit(registration) {
  editingRegistrationId.value = registration.id
  editError.value = ''
  Object.assign(editForm, {
    name: registration.name,
    email: registration.email,
    phone: registration.phone,
    gender: registration.gender,
    birth_date: registration.birth_date,
    address: registration.address,
    race_category: registration.race_category,
    shirt_size: registration.shirt_size,
    emergency_contact_name: registration.emergency_contact_name,
    emergency_contact_phone: registration.emergency_contact_phone,
    medical_condition: registration.medical_condition || ''
  })
}

function closeEdit() {
  if (isSavingEdit.value) return
  editingRegistrationId.value = null
  editError.value = ''
}

async function saveEdit() {
  isSavingEdit.value = true
  editError.value = ''
  actionMessage.value = ''

  try {
    const response = await fetch(`${apiUrl}/api/registrations/${editingRegistrationId.value}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(editForm)
    })
    const body = await response.json()

    if (response.status === 401) {
      resetToLogin('Sesi admin telah berakhir. Silakan login kembali.')
      return
    }

    if (!response.ok) {
      editError.value = body.error?.message || 'Data peserta gagal diperbarui.'
      return
    }

    editingRegistrationId.value = null
    actionMessage.value = `Data ${body.data.name} berhasil diperbarui.`
    await loadRegistrations()
  } catch {
    editError.value = 'Data peserta belum dapat diperbarui. Silakan coba lagi.'
  } finally {
    isSavingEdit.value = false
  }
}

async function deleteRegistration(registration) {
  const confirmed = window.confirm(
    `Hapus registrasi ${registration.name} (${registration.registration_code})? Tindakan ini tidak dapat dibatalkan.`
  )

  if (!confirmed) return

  deletingRegistrationId.value = registration.id
  errorMessage.value = ''
  actionMessage.value = ''

  try {
    const response = await fetch(`${apiUrl}/api/registrations/${registration.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (response.status === 401) {
      resetToLogin('Sesi admin telah berakhir. Silakan login kembali.')
      return
    }

    if (!response.ok) throw new Error('Data peserta gagal dihapus')

    if (registrations.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1
    }

    actionMessage.value = `Registrasi ${registration.name} berhasil dihapus.`
    await loadRegistrations()
  } catch {
    errorMessage.value = 'Data peserta belum dapat dihapus. Silakan coba lagi.'
  } finally {
    deletingRegistrationId.value = null
  }
}

async function checkSession() {
  authState.value = 'checking'
  loginError.value = ''

  try {
    const response = await fetch(`${apiUrl}/api/auth/session`, {
      credentials: 'include'
    })

    if (response.status === 401) {
      resetToLogin()
      return
    }

    if (!response.ok) throw new Error('Gagal memeriksa sesi admin')

    const body = await response.json()
    currentUsername.value = body.data.username
    authState.value = 'authenticated'
    await loadRegistrations()
  } catch {
    resetToLogin('Backend belum dapat dihubungi. Silakan coba lagi.')
  }
}

async function login() {
  isLoggingIn.value = true
  loginError.value = ''

  try {
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })
    const body = await response.json()

    if (response.status === 401) {
      loginError.value = body.error?.message || 'Username atau password salah.'
      return
    }

    if (!response.ok) throw new Error('Login admin gagal')

    currentUsername.value = body.data.username
    password.value = ''
    authState.value = 'authenticated'
    await loadRegistrations()
  } catch {
    loginError.value = 'Login belum dapat diproses. Pastikan backend sedang berjalan.'
  } finally {
    isLoggingIn.value = false
  }
}

async function logout() {
  isLoggingOut.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) throw new Error('Logout admin gagal')

    username.value = ''
    resetToLogin('Anda telah logout dari dashboard.')
  } catch {
    errorMessage.value = 'Logout belum dapat diproses. Silakan coba lagi.'
  } finally {
    isLoggingOut.value = false
  }
}

watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.page = 1
    loadRegistrations()
  }, 300)
})

onMounted(checkSession)
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <main v-if="authState === 'checking'" class="auth-page" data-testid="auth-loading">
    <section class="login-card login-card--loading">
      <p class="eyebrow">Campus Fun Run 2026</p>
      <h1>Memeriksa sesi admin</h1>
      <p class="subtitle">Mohon tunggu sebentar...</p>
    </section>
  </main>

  <main v-else-if="authState === 'unauthenticated'" class="auth-page" data-testid="admin-login">
    <section class="login-card">
      <div class="login-heading">
        <img
          class="admin-logo"
          src="/logo-eue-transparent.png"
          alt="Logo Universitas Esa Unggul"
          data-testid="eue-admin-logo"
        />
        <p class="eyebrow">Campus Fun Run 2026</p>
        <h1>Login Admin</h1>
        <p class="subtitle">Masukkan akun admin untuk membuka data peserta.</p>
      </div>

      <p v-if="loginError" class="login-notice" data-testid="admin-login-error">
        {{ loginError }}
      </p>

      <form data-testid="admin-login-form" @submit.prevent="login">
        <label>
          <span>Username</span>
          <input
            v-model.trim="username"
            data-testid="admin-username-input"
            name="username"
            autocomplete="username"
            required
            autofocus
          />
        </label>

        <label>
          <span>Password</span>
          <input
            v-model="password"
            data-testid="admin-password-input"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>

        <button data-testid="admin-login-submit" type="submit" :disabled="isLoggingIn">
          {{ isLoggingIn ? 'Memproses...' : 'Login ke dashboard' }}
        </button>
      </form>
    </section>
  </main>

  <main v-else data-testid="admin-dashboard">
    <header>
      <div class="dashboard-heading">
        <img
          class="admin-logo"
          src="/logo-eue-transparent.png"
          alt="Logo Universitas Esa Unggul"
          data-testid="eue-admin-logo"
        />
        <p class="eyebrow">Campus Fun Run 2026</p>
        <h1>Dashboard Peserta</h1>
        <p class="subtitle">Pantau data pendaftaran yang masuk dari website event.</p>
      </div>

      <div class="header-actions">
        <span class="admin-identity">
          Login sebagai <strong data-testid="admin-current-username">{{ currentUsername }}</strong>
        </span>
        <button data-testid="reload-registrations" :disabled="isLoading" @click="loadRegistrations">
          {{ isLoading ? 'Memuat...' : 'Muat ulang data' }}
        </button>
        <button
          class="button--secondary"
          data-testid="admin-logout"
          :disabled="isLoggingOut"
          @click="logout"
        >
          {{ isLoggingOut ? 'Keluar...' : 'Logout' }}
        </button>
      </div>
    </header>

    <section class="stats" aria-label="Ringkasan pendaftaran">
      <article>
        <span>Total peserta</span>
        <strong data-testid="total-registrations">{{ summary.total }}</strong>
      </article>
      <article>
        <span>Kategori 5K</span>
        <strong>{{ summary.total5K }}</strong>
      </article>
      <article>
        <span>Kategori 10K</span>
        <strong>{{ summary.total10K }}</strong>
      </article>
    </section>

    <section class="table-card">
      <div class="table-heading">
        <div>
          <h2>Daftar registrasi</h2>
          <p>Data terbaru ditampilkan paling atas.</p>
        </div>
        <span class="count-badge" data-testid="filtered-registration-count">
          {{ searchQuery ? `${pagination.total} dari ${summary.total} data` : `${summary.total} data` }}
        </span>
      </div>

      <div v-if="!errorMessage && summary.total > 0" class="table-toolbar">
        <label>
          <span>Cari peserta</span>
          <input
            v-model="searchQuery"
            data-testid="registration-search"
            type="search"
            placeholder="Nama, email, atau kode registrasi"
          />
        </label>
        <button
          v-if="searchQuery"
          class="button--secondary"
          data-testid="clear-registration-search"
          @click="searchQuery = ''"
        >
          Bersihkan pencarian
        </button>
      </div>

      <p v-if="actionMessage" class="action-notice" data-testid="registration-action-success">
        {{ actionMessage }}
      </p>

      <p v-if="isLoading" class="state-message" data-testid="registrations-loading">
        Memuat data peserta...
      </p>

      <div v-else-if="errorMessage" class="state-message state-message--error" data-testid="registrations-error">
        <p>{{ errorMessage }}</p>
        <button @click="loadRegistrations">Coba lagi</button>
      </div>

      <p v-else-if="summary.total === 0" class="state-message" data-testid="registrations-empty">
        Belum ada peserta yang mendaftar.
      </p>

      <p v-else-if="pagination.total === 0" class="state-message" data-testid="registrations-no-results">
        Peserta tidak ditemukan untuk kata kunci tersebut.
      </p>

      <div v-else class="table-wrapper">
        <table data-testid="registrations-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Peserta</th>
              <th>Lomba</th>
              <th>Kontak darurat</th>
              <th>Kondisi medis</th>
              <th>Terdaftar</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="registration in registrations"
              :key="registration.id"
              data-testid="registration-row"
              :data-registration-email="registration.email"
            >
              <td><code data-testid="registration-code">{{ registration.registration_code }}</code></td>
              <td>
                <strong>{{ registration.name }}</strong>
                <span data-testid="registration-email">{{ registration.email }}</span>
                <span>{{ registration.phone }}</span>
                <span>{{ registration.gender }} · {{ registration.birth_date }}</span>
                <small>{{ registration.address }}</small>
              </td>
              <td>
                <span class="category" data-testid="registration-category">{{ registration.race_category }}</span>
                <span>Jersey {{ registration.shirt_size }}</span>
              </td>
              <td>
                <strong>{{ registration.emergency_contact_name }}</strong>
                <span>{{ registration.emergency_contact_phone }}</span>
              </td>
              <td>{{ registration.medical_condition || 'Tidak ada' }}</td>
              <td>{{ formatDate(registration.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button
                    class="button--small button--secondary"
                    :data-testid="`edit-registration-${registration.id}`"
                    @click="openEdit(registration)"
                  >
                    Edit
                  </button>
                  <button
                    class="button--small button--danger"
                    :data-testid="`delete-registration-${registration.id}`"
                    :disabled="deletingRegistrationId === registration.id"
                    @click="deleteRegistration(registration)"
                  >
                    {{ deletingRegistrationId === registration.id ? 'Menghapus...' : 'Hapus' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav
        v-if="!isLoading && !errorMessage && pagination.totalPages > 1"
        class="pagination"
        aria-label="Navigasi halaman peserta"
        data-testid="registration-pagination"
      >
        <button
          class="button--secondary"
          data-testid="pagination-previous"
          :disabled="pagination.page === 1"
          @click="goToPage(pagination.page - 1)"
        >
          Sebelumnya
        </button>
        <span data-testid="pagination-status">
          Halaman <strong>{{ pagination.page }}</strong> dari <strong>{{ pagination.totalPages }}</strong>
        </span>
        <button
          class="button--secondary"
          data-testid="pagination-next"
          :disabled="pagination.page === pagination.totalPages"
          @click="goToPage(pagination.page + 1)"
        >
          Berikutnya
        </button>
      </nav>
    </section>

    <div v-if="editingRegistrationId" class="modal-backdrop" @click.self="closeEdit">
      <section class="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-registration-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Kelola peserta</p>
            <h2 id="edit-registration-title">Edit data registrasi</h2>
          </div>
          <button class="button--secondary button--small" type="button" @click="closeEdit">
            Tutup
          </button>
        </div>

        <p v-if="editError" class="login-notice" data-testid="edit-registration-error">
          {{ editError }}
        </p>

        <form class="edit-form" data-testid="edit-registration-form" @submit.prevent="saveEdit">
          <label class="full-width">
            <span>Nama lengkap</span>
            <input v-model="editForm.name" name="name" required />
          </label>
          <label>
            <span>Email</span>
            <input v-model="editForm.email" name="email" type="email" required />
          </label>
          <label>
            <span>Nomor telepon</span>
            <input v-model="editForm.phone" name="phone" type="tel" required />
          </label>
          <label>
            <span>Jenis kelamin</span>
            <select v-model="editForm.gender" name="gender" required>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </label>
          <label>
            <span>Tanggal lahir</span>
            <input v-model="editForm.birth_date" name="birth_date" type="date" required />
          </label>
          <label class="full-width">
            <span>Alamat</span>
            <textarea v-model="editForm.address" name="address" rows="3" required></textarea>
          </label>
          <label>
            <span>Kategori lari</span>
            <select v-model="editForm.race_category" name="race_category" required>
              <option value="5K">5K</option>
              <option value="10K">10K</option>
            </select>
          </label>
          <label>
            <span>Ukuran jersey</span>
            <select v-model="editForm.shirt_size" name="shirt_size" required>
              <option v-for="size in ['S', 'M', 'L', 'XL', 'XXL']" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
          </label>
          <label>
            <span>Nama kontak darurat</span>
            <input v-model="editForm.emergency_contact_name" name="emergency_contact_name" required />
          </label>
          <label>
            <span>Telepon kontak darurat</span>
            <input v-model="editForm.emergency_contact_phone" name="emergency_contact_phone" type="tel" required />
          </label>
          <label class="full-width">
            <span>Kondisi medis atau alergi</span>
            <textarea v-model="editForm.medical_condition" name="medical_condition" rows="3"></textarea>
          </label>

          <div class="modal-actions full-width">
            <button class="button--secondary" type="button" :disabled="isSavingEdit" @click="closeEdit">
              Batal
            </button>
            <button data-testid="save-registration-edit" type="submit" :disabled="isSavingEdit">
              {{ isSavingEdit ? 'Menyimpan...' : 'Simpan perubahan' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>
