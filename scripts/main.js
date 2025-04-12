import { ComfortMenu } from "./comfort-app.js";

Hooks.on("renderItemSheetV2", (sheet, html, data) => {
    const item = sheet.item;
    if (item.type !== "loot") return;
  
    const lootType = foundry.utils.getProperty(item.system, "type.value");
    if (lootType !== "furniture") return;
  
    const currentValue = item.getFlag("comfort-system", "comfort") ?? 0;
    const root = html instanceof HTMLElement ? html : html[0];
  
    // ❌ Empêche la duplication
    if (root.querySelector(".comfort-module-fieldset")) return;
  
    // 🧩 Crée le fieldset
    const fieldset = document.createElement("fieldset");
    fieldset.classList.add("comfort-module-fieldset");
  
    // 🪧 Titre localisé + underline pour Tidy5e
    const legend = document.createElement("legend");
    const localizedTitle = game.i18n.localize("COMFORT.SectionTitle");
  
    // Vérifie si on est sur Tidy5e
    const tidyFieldset = [...root.querySelectorAll("fieldset")].find(fs =>
      fs.querySelector("legend")?.textContent?.includes("Tidy 5e Sheets Settings")
    );
  
    if (tidyFieldset) {
      legend.innerHTML = `
        ${localizedTitle}
        <tidy-gold-header-underline>
          <div role="presentation" class="gold-header-underline"></div>
        </tidy-gold-header-underline>
      `;
    } else {
      legend.textContent = localizedTitle;
    }
  
    fieldset.appendChild(legend);
  
    // 🔢 Champ de valeur
    const wrapper = document.createElement("div");
    wrapper.classList.add("form-group", "comfort-value-wrapper");
    wrapper.innerHTML = `
      <label for="comfort-value">${game.i18n.localize("COMFORT.ComfortValue")}</label>
      <div class="form-fields">
        <input type="number" name="flags.comfort-system.comfort" id="comfort-value"
          value="${currentValue}" data-dtype="Number" />
      </div>
    `;
    fieldset.appendChild(wrapper);
  
    // 📦 Injection au bon endroit
    if (tidyFieldset) {
      tidyFieldset.parentElement.insertBefore(fieldset, tidyFieldset);
    } else {
      const detailsTab = root.querySelector('.tab.details');
      if (detailsTab) detailsTab.appendChild(fieldset);
    }
  });
  
  Hooks.on("getSceneControlButtons", controls => {
    // Cherche le contrôle de base "token"
    const tokenControls = controls.find(c => c.name === "token");
    if (!tokenControls) return;
  
    tokenControls.tools.push({
      name: "comfort-menu",
      title: game.i18n.localize("COMFORT.ButtonTitle"),
      icon: "fas fa-couch", // n'importe quelle icône FontAwesome
      button: true,
      onClick: () => {
        new ComfortMenu().render(true);
      },
      visible: game.user.isGM || !!game.user.character // tu peux ajuster ça
    });
  });
  

  Hooks.on("renderActorSheet5eCharacter", (sheet, html, data) => {
    const bastionTab = html.find('.tab[data-tab="bastion"]');
    if (!bastionTab.length) return;
  
  const descriptionBox = html[0].querySelector('.tab[data-tab="bastion"] .description');
  if (!descriptionBox) return;
  
  const totalComfort = getTotalComfortValue();

  const openMenuLabel = game.i18n.localize("COMFORT.OpenMenu");
  const totalComfortLabel = game.i18n.localize("COMFORT.TotalComfort");
  const comfortLabel = game.i18n.localize("COMFORT.ComfortLabel");

  const btnCard = $(`
    <section class="comfort">
      <h3 class="icon"><i class="fas fa-couch"></i><span class="roboto-upper"> ${comfortLabel}</span></h3>
      <div class="card-content">
        <button type="button" class="comfort-bastion-button">
          ${openMenuLabel}
        </button>
        <p style="margin-top: 0.5em;width: 100%;border: none;box-shadow: none;font-style: italic;color: var(--color-text-dark-5);">
          ${totalComfortLabel} :
          <strong class="comfort-total-bastion">${totalComfort}</strong>
        </p>
      </div>
    </section>
  `);
  
  
    btnCard.find(".comfort-bastion-button").on("click", () => {
      const actor = sheet.actor;
      const items = actor.items.filter(i =>
        i.type === "loot" &&
        i.system?.type?.value === "furniture"
      );
      new ComfortMenu(items).render(true);
    });
  
    if (descriptionBox) {
        descriptionBox.parentElement.insertBefore(btnCard[0], descriptionBox);
      } else {
        bastionTab.append(btnCard);
      }
  });

  Hooks.on("updateTile", (tile, changes, options, userId) => {
    const sceneId = game.settings.get("comfort-system", "bastionSceneId");
    if (tile.parent.id !== sceneId) return;
  
    updateComfortInMenu();
    $(".comfort-total-bastion").text(getTotalComfortValue());
  });
  
  Hooks.on("createTile", (...args) => Hooks.call("updateTile", ...args));
  Hooks.on("deleteTile", (...args) => Hooks.call("updateTile", ...args));  

  export function getTotalComfortValue() {
    const scene = game.scenes.get(game.settings.get("comfort-system", "bastionSceneId"));
    if (!scene) return 0;
  
    return scene.tiles.contents.reduce((total, tile) => {
      const value = tile.getFlag("comfort-system", "comfort") ?? 0;
      return total + Number(value);
    }, 0);
  }
  
  export function updateComfortInMenu() {
    const el = document.querySelector(".comfort-total-value");
    if (el) {
      el.textContent = getTotalComfortValue();
    }
  
    const bastionValue = document.querySelector(".comfort-total-bastion");
    if (bastionValue) {
      bastionValue.textContent = getTotalComfortValue();
    }
  }
  