import { getTotalComfortValue } from "./main.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ComfortMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    static PARTS = {
      dialog: {
        id: 'comfort-menu',
        classes: ['comfort'],
        template: 'modules/comfort-system/templates/comfort-menu.hbs'
      }
    };
  
    constructor(items = []) {
      super();
      this.items = items;
    }
  
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
        window: {
          resizable: false
        },
        position: {
          height: "auto",
          width: 600
        }
      }, { inplace: false });
      
      get title() {
        return game.i18n.localize("COMFORT.MenuTitle");
      }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
    
      let actor = game.user.character;

      if (game.user.isGM && canvas.tokens.controlled.length > 0) {
        const controlledToken = canvas.tokens.controlled[0];
        if (controlledToken?.actor) actor = controlledToken.actor;
      }
      
      if (!actor) {
        ui.notifications.warn(game.i18n.localize("COMFORT.NoCharacter"));
        context.items = [];
        context.totalComfort = 0;
        return context;
      }
      
    
      const items = actor.items.filter(i =>
        i.type === "loot" &&
        i.system?.type?.value === "furniture"
      );
    
      for (const item of items) {
        if (!Object.prototype.hasOwnProperty.call(item, "comfort")) {
          Object.defineProperty(item, "comfort", {
            get: () => item.getFlag("comfort-system", "comfort") ?? 0
          });
        }
      }
      
      context.items = items;
      
      context.totalComfort = getTotalComfortValue();
      const bastionSceneId = game.settings.get("comfort-system", "bastionSceneId");
      const isOnBastionScene = canvas.scene?.id === bastionSceneId;
      
      context.sceneIsHome = game.user.isGM || isOnBastionScene;
      context.isBypass = game.user.isGM && !isOnBastionScene;
      
    
      return context;
    }
    
  
    async _onRender(context, options) {
        await super._onRender(context, options);
      
        this.element.querySelectorAll(".comfort-place").forEach(button => {
          button.addEventListener("click", async ev => {
            const uuid = ev.currentTarget.dataset.uuid;
            const item = await fromUuid(uuid);
            if (!item) return;
      
            this.minimize();
            this._activateTilePlacer(item);
          });
        });
      }

    _activateTilePlacer(item) {
        const PIXI = globalThis.PIXI || window.PIXI;
        const img = item.img;
        const comfortValue = item.getFlag("comfort-system", "comfort") ?? 0;
        const size = canvas.grid.size;
      
        const preview = new PIXI.Sprite(PIXI.Texture.from(img));
        preview.alpha = 0.5;
        preview.width = size;
        preview.height = size;
        preview.anchor.set(0.5);
        canvas.stage.addChild(preview);
      
        const onMouseMove = event => {
          const pos = event.data.getLocalPosition(preview.parent);
          preview.position.set(pos.x, pos.y);
        };
      
        const onPointerDown = async event => {
            let actor = null; // 🔧 déclaration ici en haut du scope
            if (event.button === 2) {
              cleanup();
              return;
            }
          
            if (event.button !== 0) return;
          
            const globalPos = event.data?.global;
            if (!globalPos) return;
          
            const pos = preview.parent.toLocal(globalPos);
          
            const snappedPoint = canvas.grid.getSnappedPoint(
              { x: pos.x - size / 2, y: pos.y - size / 2 },
              { mode: 1 }
            );
          
            if (!snappedPoint) {
              ui.notifications.warn(game.i18n.localize("COMFORT.InvalidAnchor"));
              return;
            }
          
            const snapped = { x: snappedPoint.x, y: snappedPoint.y };
          
            try {
              const tileData = {
                texture: { src: img },
                x: snapped.x,
                y: snapped.y,
                width: size,
                height: size,
                flags: {
                  "comfort-system": {
                    comfort: comfortValue
                  }
                }
              };
          
              await canvas.scene.createEmbeddedDocuments("Tile", [tileData]);
              console.log(game.i18n.localize("COMFORT.TileCreated"));
            // 💬 récupération correcte de l’acteur
            const consume = game.settings.get("comfort-system", "consumeOnPlace");
            actor = game.user.character;
            if (game.user.isGM && canvas.tokens.controlled.length > 0) {
                const controlled = canvas.tokens.controlled[0];
                if (controlled?.actor) actor = controlled.actor;
            }

            if (consume && actor && item?.id && actor.items.has(item.id)) {
                const invItem = actor.items.get(item.id);
                const qty = foundry.utils.getProperty(invItem.system, "quantity") ?? 1;
              
                if (qty > 1) {
                  await invItem.update({ "system.quantity": qty - 1 });
                } else {
                  await invItem.delete();
                }
              
                this.render(true); // 🧼 Re-render complet du menu avec inventaire mis à jour
              }

            } catch (e) {
            console.error(game.i18n.localize("COMFORT.TileError"), e);
            }
            ui.notifications.info(game.i18n.format("COMFORT.Notification.Placed", { name: item.name }));
            cleanup();
            };
          
      
        const onContextMenu = event => {
          event.preventDefault();
        };
      
        const cleanup = () => {
          canvas.stage.removeChild(preview);
          canvas.stage.off("pointermove", onMouseMove);
          canvas.stage.off("pointerdown", onPointerDown);          
          canvas.app.view.removeEventListener("contextmenu", onContextMenu);
          this.maximize();
        };
      
        canvas.stage.on("pointermove", onMouseMove);
        canvas.stage.on("pointerdown", onPointerDown);        
        canvas.app.view.addEventListener("contextmenu", onContextMenu);
      }        
  }
  