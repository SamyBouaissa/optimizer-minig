const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS = 'C:/Users/samyb/.cursor/projects/c-Users-samyb-Dofus/assets/';
const OUT = 'C:/Users/samyb/Dofus/optimizer-minig/frontend/public/icons/';

// Each entry: { file, name, left, top, width, height }
// Icons appear in top-right corner of each screenshot
const crops = [
  // Prix screenshots (432x379) : icon top-left ~90x90
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-e7d789a4-08df-492a-9650-a47071de43ac.png', name: 'fer',         left: 18, top: 50,  width: 95, height: 95 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-c3fa854b-d76c-480e-81a8-5c85c0465cee.png', name: 'cuivre',      left: 18, top: 50,  width: 95, height: 95 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-e0b61b6a-d304-4e2d-9d9d-ddacff0e9e73.png', name: 'charbon',     left: 18, top: 50,  width: 95, height: 95 },
  // Fiche minerai (375x165) : icon right side, ~x250 y10 w110 h110
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-585c4680-0bcb-4460-90bc-65391f4dfa98.png', name: 'bronze',      left: 250, top: 10, width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-1f3e5f11-cdf5-4b73-ad4b-f358f55f2d48.png', name: 'kobalte',     left: 250, top: 10, width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-5fd2934c-626a-4258-85bd-6893878546c1.png', name: 'manganese',   left: 320, top: 10, width: 120, height: 120 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-21d332ed-040b-4eba-9943-a7cc8c5c8434.png', name: 'etain',       left: 240, top: 5,  width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-e2885558-4ced-4483-8ca5-e9c7bdee216b.png', name: 'argent',      left: 240, top: 5,  width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-5a6b87c4-5efc-46e2-a092-db19fa0b993f.png', name: 'bauxite',     left: 240, top: 5,  width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-fef03557-34a2-479f-baab-c277a428e85e.png', name: 'or',          left: 245, top: 5,  width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-f19c37ff-5c42-431f-a7a7-3dc76a4c87a7.png', name: 'dolomite',    left: 240, top: 5,  width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-b259d7ed-6b32-444c-a866-33dbb059d926.png', name: 'cendrepierre',left: 250, top: 5,  width: 110, height: 110 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-5b50d53d-775f-477f-88de-efd3421744a0.png', name: 'silicate',    left: 250, top: 5,  width: 100, height: 100 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-4246e04d-6cb6-44ee-b01d-4a5fb1e50983.png', name: 'obsidienne',  left: 250, top: 5,  width: 120, height: 120 },
  // Alliage price screenshots (430x325) : icon top-left ~x15 y15 w90 h90
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-6f496175-f0aa-4604-b927-33b22d6bc372.png', name: 'ferrite',    left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-07f01df6-5dac-43d5-83be-fb202e8d2356.png', name: 'aluminite',  left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-47967af5-59a1-41ad-8f2e-bb2550727d84.png', name: 'ebonite',    left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-aa4c549c-483a-47da-9fa9-a17ebeacf04d.png', name: 'magnesite',  left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-f08dd2c6-3e2b-4dcc-9913-f6b52d6e1a91.png', name: 'bakelelite', left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-38579c06-46ad-4b03-b00c-85c22dc51084.png', name: 'kouartz',    left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-01fb34db-d8b6-4c0d-be19-edde3f0c382d.png', name: 'plaque',     left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-b81f75ac-2459-490d-ab3d-4e4085822e8f.png', name: 'kriptonite', left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-e7407b47-d319-418e-928e-7f9660974752.png', name: 'kobalite',   left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-f02bc445-35d7-4416-88eb-6156fb621a75.png', name: 'rutile',     left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-99317b76-80b3-43e4-9026-14fa66f62abf.png', name: 'pyrute',     left: 15, top: 15, width: 90, height: 90 },
  { file: 'c__Users_samyb_AppData_Roaming_Cursor_User_workspaceStorage_0ce8f5f450c201073959583f63955931_images_image-a88505e4-ccad-40b3-81bd-a9f7dcbbe026.png', name: 'ardonite',   left: 15, top: 15, width: 90, height: 90 },
];

async function run() {
  for (const c of crops) {
    const src = ASSETS + c.file;
    if (!fs.existsSync(src)) { console.log('MISSING: ' + c.name); continue; }
    const meta = await sharp(src).metadata();
    // clamp to image bounds
    const left = Math.min(c.left, meta.width - 10);
    const top = Math.min(c.top, meta.height - 10);
    const width = Math.min(c.width, meta.width - left);
    const height = Math.min(c.height, meta.height - top);
    await sharp(src)
      .extract({ left, top, width, height })
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(OUT + c.name + '.png');
    console.log('OK ' + c.name + ' (' + meta.width + 'x' + meta.height + ')');
  }
}
run().catch(console.error);
