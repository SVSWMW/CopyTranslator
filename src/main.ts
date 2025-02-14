import { ipcRenderer } from "electron";
import Vue from "vue";

import { RendererController } from "./renderer";
import bus from "./common/event-bus";
const rendererController = RendererController.getInstance();
Vue.prototype.$controller = rendererController;
Vue.config.productionTip = false;

(window as any).requestIdleCallback(() => {
  bus.gat("firstLoad");
});
