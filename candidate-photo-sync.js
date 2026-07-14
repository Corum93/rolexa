(() => {
  if (window.__rolexaCandidatePhotoSync) return;
  window.__rolexaCandidatePhotoSync = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd',
    bucket: 'candidate-photos',
    maxBytes: 5 * 1024 * 1024
  };

  let client = null;
  let user = null;
  let currentPath = '';

  function byId(id){ return document.getElementById(id); }

  function status(kind, text){
    let el = byId('rolexaPhotoStatusToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rolexaPhotoStatusToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;padding:11px 15px;border-radius:999px;font:800 13px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(7,16,37,.2);display:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
    el.style.background = kind === 'bad' ? '#FBE4E1' : kind === 'good' ? '#E1F6EB' : '#EEF3FF';
    el.style.color = kind === 'bad' ? '#A33327' : kind === 'good' ? '#176B49' : '#2946C7';
    clearTimeout(window.__rolexaPhotoToastTimer);
    window.__rolexaPhotoToastTimer = setTimeout(() => { el.style.display = 'none'; }, 3400);
  }

  function loadSupabase(){
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function addStyles(){
    if (byId('rolexaCandidatePhotoStyles')) return;
    const style = document.createElement('style');
    style.id = 'rolexaCandidatePhotoStyles';
    style.textContent = '.rx-photo-field{grid-column:1/-1}.rx-photo-upload-wrap{display:flex;align-items:center;gap:16px;border:1px solid rgba(7,16,37,.1);background:#F5F7FC;border-radius:16px;padding:14px}.rx-photo-preview{width:72px;height:72px;border-radius:50%;object-fit:cover;background:#176BFF;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;flex:0 0 auto}.rx-photo-copy{display:grid;gap:7px;min-width:0}.rx-photo-copy input{max-width:100%}.rx-photo-help{font-size:12px;color:#6B7280;line-height:1.45}@media(max-width:620px){.rx-photo-upload-wrap{align-items:flex-start;flex-direction:column}}';
    document.head.appendChild(style);
  }

  function initials(){
    const name = byId('fullName') ? byId('fullName').value.trim() : '';
    return (name || 'Candidate').split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase();
  }

  function setPreview(url){
    const preview = byId('candidatePhotoPreview');
    if (!preview) return;
    if (url) {
      preview.innerHTML = '';
      preview.style.backgroundImage = `url("${url}")`;
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
    } else {
      preview.style.backgroundImage = '';
      preview.textContent = initials();
    }
  }

  function addPhotoField(){
    if (byId('candidatePhotoUpload')) return;
    const cvField = byId('cvUploadField');
    const form = byId('profileForm');
    if (!form) return;
    addStyles();

    const field = document.createElement('div');
    field.className = 'field full rx-photo-field';
    field.id = 'candidatePhotoField';
    field.innerHTML = `
      <label for="candidatePhotoUpload">Profile photo <span style="font-weight:700;color:#6B7280;text-transform:none;letter-spacing:0">(optional)</span></label>
      <div class="rx-photo-upload-wrap">
        <div class="rx-photo-preview" id="candidatePhotoPreview">${initials()}</div>
        <div class="rx-photo-copy">
          <input id="candidatePhotoUpload" type="file" accept="image/jpeg,image/png,image/webp">
          <div class="rx-photo-help" id="candidatePhotoUploadStatus">Upload a JPG, PNG or WebP image. Maximum size 5MB.</div>
        </div>
      </div>`;

    if (cvField) cvField.insertAdjacentElement('beforebegin', field);
    else form.insertBefore(field, form.firstChild);

    const input = byId('candidatePhotoUpload');
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
        input.value = '';
        byId('candidatePhotoUploadStatus').textContent = 'Use a JPG, PNG or WebP image.';
        setPreview('');
        return;
      }
      if (file.size > CONFIG.maxBytes) {
        input.value = '';
        byId('candidatePhotoUploadStatus').textContent = 'Image is too large. Maximum size is 5MB.';
        setPreview('');
        return;
      }
      setPreview(URL.createObjectURL(file));
      byId('candidatePhotoUploadStatus').textContent = `Ready to upload: ${file.name}`;
    });
  }

  async function loadCurrentPhoto(){
    const { data, error } = await client.from('candidate_profiles').select('photo_file_path,photo_file_name').eq('user_id', user.id).maybeSingle();
    if (error || !data || !data.photo_file_path) return;
    currentPath = data.photo_file_path;
    const signed = await client.storage.from(CONFIG.bucket).createSignedUrl(currentPath, 3600);
    if (!signed.error && signed.data && signed.data.signedUrl) setPreview(signed.data.signedUrl);
    const helper = byId('candidatePhotoUploadStatus');
    if (helper) helper.textContent = `Current photo: ${data.photo_file_name || 'Profile photo'}`;
  }

  async function uploadSelectedPhoto(){
    const input = byId('candidatePhotoUpload');
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.');
    if (file.size > CONFIG.maxBytes) throw new Error('Image is too large. Maximum size is 5MB.');

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/profile.${ext}`;
    const upload = await client.storage.from(CONFIG.bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (upload.error) throw upload.error;

    const update = await client.from('candidate_profiles').update({
      photo_file_path: path,
      photo_file_name: file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120),
      photo_file_type: file.type,
      photo_uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('user_id', user.id);
    if (update.error) throw update.error;

    currentPath = path;
    const signed = await client.storage.from(CONFIG.bucket).createSignedUrl(path, 3600);
    if (!signed.error && signed.data && signed.data.signedUrl) setPreview(signed.data.signedUrl);
    const helper = byId('candidatePhotoUploadStatus');
    if (helper) helper.textContent = `Current photo: ${file.name}`;
    input.value = '';
  }

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    addPhotoField();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      const session = await client.auth.getSession();
      user = session.data && session.data.session && session.data.session.user;
      if (!user) return;
      await loadCurrentPhoto();

      const form = byId('profileForm');
      if (form && !form.dataset.photoSyncAttached) {
        form.dataset.photoSyncAttached = 'true';
        form.addEventListener('submit', async () => {
          try {
            const input = byId('candidatePhotoUpload');
            if (!input || !input.files || !input.files[0]) return;
            status('info', 'Uploading profile photo...');
            await uploadSelectedPhoto();
            status('good', 'Profile photo saved.');
          } catch (error) {
            console.warn('Rolexa photo upload failed', error);
            status('bad', error.message || 'Could not save profile photo.');
          }
        });
      }
    } catch (error) {
      console.warn('Rolexa candidate photo sync failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();