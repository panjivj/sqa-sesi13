<script setup>
import { computed, onMounted, ref } from 'vue'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const registrations = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const total5K = computed(() => registrations.value.filter((item) => item.race_category === '5K').length)
const total10K = computed(() => registrations.value.filter((item) => item.race_category === '10K').length)

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(`${value.replace(' ', 'T')}Z`))
}

async function loadRegistrations() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${apiUrl}/api/registrations`)
    if (!response.ok) throw new Error('Gagal mengambil data peserta')

    const body = await response.json()
    registrations.value = body.data
  } catch {
    errorMessage.value = 'Data peserta belum dapat dimuat. Pastikan backend sedang berjalan.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRegistrations)
</script>

<template>
  <main data-testid="admin-dashboard">
    <header>
      <div>
        <p class="eyebrow">Campus Fun Run 2026</p>
        <h1>Dashboard Peserta</h1>
        <p class="subtitle">Pantau data pendaftaran yang masuk dari website event.</p>
      </div>

      <button data-testid="reload-registrations" :disabled="isLoading" @click="loadRegistrations">
        {{ isLoading ? 'Memuat...' : 'Muat ulang data' }}
      </button>
    </header>

    <section class="stats" aria-label="Ringkasan pendaftaran">
      <article>
        <span>Total peserta</span>
        <strong data-testid="total-registrations">{{ registrations.length }}</strong>
      </article>
      <article>
        <span>Kategori 5K</span>
        <strong>{{ total5K }}</strong>
      </article>
      <article>
        <span>Kategori 10K</span>
        <strong>{{ total10K }}</strong>
      </article>
    </section>

    <section class="table-card">
      <div class="table-heading">
        <div>
          <h2>Daftar registrasi</h2>
          <p>Data terbaru ditampilkan paling atas.</p>
        </div>
        <span class="count-badge">{{ registrations.length }} data</span>
      </div>

      <p v-if="isLoading" class="state-message" data-testid="registrations-loading">
        Memuat data peserta...
      </p>

      <div v-else-if="errorMessage" class="state-message state-message--error" data-testid="registrations-error">
        <p>{{ errorMessage }}</p>
        <button @click="loadRegistrations">Coba lagi</button>
      </div>

      <p v-else-if="registrations.length === 0" class="state-message" data-testid="registrations-empty">
        Belum ada peserta yang mendaftar.
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
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
