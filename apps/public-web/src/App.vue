<script setup>
import { onMounted, reactive, ref } from 'vue'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const event = ref(null)
const eventError = ref('')
const isSubmitting = ref(false)
const submitError = ref('')
const registrationCode = ref('')

const form = reactive({
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
  medical_condition: '',
  agree_to_terms: false
})

function formatEventDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long'
  }).format(new Date(`${value}T00:00:00`))
}

async function loadEvent() {
  try {
    const response = await fetch(`${apiUrl}/api/event`)
    if (!response.ok) throw new Error('Gagal mengambil informasi event')

    const body = await response.json()
    event.value = body.data
  } catch {
    eventError.value = 'Informasi event belum dapat dimuat. Pastikan backend sedang berjalan.'
  }
}

async function submitRegistration() {
  isSubmitting.value = true
  submitError.value = ''
  registrationCode.value = ''

  try {
    const response = await fetch(`${apiUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form)
    })
    const body = await response.json()

    if (!response.ok) {
      throw new Error(body.error?.message || 'Pendaftaran gagal dikirim')
    }

    registrationCode.value = body.data.registration_code
  } catch (error) {
    submitError.value = error.message || 'Pendaftaran gagal dikirim. Silakan coba lagi.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(loadEvent)
</script>

<template>
  <main>
    <section class="hero">
      <div class="hero__content">
        <p class="eyebrow">Run together, finish stronger</p>

        <div v-if="event" data-testid="event-details">
          <h1 data-testid="event-name">{{ event.name }}</h1>
          <p class="hero__description">{{ event.description }}</p>
          <div class="event-meta">
            <span>📅 {{ formatEventDate(event.event_date) }}</span>
            <span>📍 {{ event.location }}</span>
          </div>
        </div>

        <p v-else-if="eventError" class="notice notice--error" data-testid="event-error">
          {{ eventError }}
        </p>
        <p v-else data-testid="event-loading">Memuat informasi event...</p>
      </div>
    </section>

    <section class="registration-section">
      <div class="form-heading">
        <p class="step-label">Formulir peserta</p>
        <h2>Daftar dan ambil garis start-mu</h2>
        <p>Isi data dengan benar agar panitia dapat menyiapkan kebutuhan lomba.</p>
      </div>

      <div v-if="registrationCode" class="notice notice--success" data-testid="registration-success">
        <strong>Pendaftaran berhasil!</strong>
        <span>
          Kode registrasi Anda:
          <b data-testid="registration-code">{{ registrationCode }}</b>
        </span>
      </div>

      <p v-if="submitError" class="notice notice--error" data-testid="registration-error">
        {{ submitError }}
      </p>

      <form data-testid="registration-form" @submit.prevent="submitRegistration">
        <fieldset>
          <legend>Data diri</legend>
          <div class="form-grid">
            <label class="full-width">
              Nama lengkap
              <input v-model="form.name" data-testid="name-input" name="name" autocomplete="name" required />
            </label>

            <label>
              Email
              <input v-model="form.email" data-testid="email-input" name="email" type="email" autocomplete="email" required />
            </label>

            <label>
              Nomor telepon
              <input v-model="form.phone" data-testid="phone-input" name="phone" type="tel" autocomplete="tel" required />
            </label>

            <label>
              Jenis kelamin
              <select v-model="form.gender" data-testid="gender-select" name="gender" required>
                <option disabled value="">Pilih jenis kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </label>

            <label>
              Tanggal lahir
              <input v-model="form.birth_date" data-testid="birth-date-input" name="birth_date" type="date" required />
            </label>

            <label class="full-width">
              Alamat
              <textarea v-model="form.address" data-testid="address-input" name="address" rows="3" required></textarea>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Pilihan lomba</legend>
          <div class="form-grid">
            <label>
              Kategori lari
              <select v-model="form.race_category" data-testid="race-category-select" name="race_category" required>
                <option disabled value="">Pilih kategori</option>
                <option value="5K">5K</option>
                <option value="10K">10K</option>
              </select>
            </label>

            <label>
              Ukuran jersey
              <select v-model="form.shirt_size" data-testid="shirt-size-select" name="shirt_size" required>
                <option disabled value="">Pilih ukuran</option>
                <option v-for="size in ['S', 'M', 'L', 'XL', 'XXL']" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Kontak darurat dan kesehatan</legend>
          <div class="form-grid">
            <label>
              Nama kontak darurat
              <input
                v-model="form.emergency_contact_name"
                data-testid="emergency-name-input"
                name="emergency_contact_name"
                required
              />
            </label>

            <label>
              Telepon kontak darurat
              <input
                v-model="form.emergency_contact_phone"
                data-testid="emergency-phone-input"
                name="emergency_contact_phone"
                type="tel"
                required
              />
            </label>

            <label class="full-width">
              Kondisi medis atau alergi <span class="optional">(opsional)</span>
              <textarea
                v-model="form.medical_condition"
                data-testid="medical-condition-input"
                name="medical_condition"
                rows="3"
                placeholder="Kosongkan jika tidak ada"
              ></textarea>
            </label>
          </div>
        </fieldset>

        <label class="terms">
          <input v-model="form.agree_to_terms" data-testid="agree-terms-input" name="agree_to_terms" type="checkbox" required />
          <span>Saya menyatakan data yang diberikan benar dan bersedia mengikuti peraturan event.</span>
        </label>

        <button data-testid="submit-registration" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Mengirim pendaftaran...' : 'Daftar sekarang' }}
        </button>
      </form>
    </section>
  </main>
</template>
