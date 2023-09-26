const utils = require("./utils");

module.exports = async function (RED) {
  const teknoir_config = await utils.config();
  const grafana = utils.grafana(teknoir_config.GRAFANA_HOST);
  function embed(fullUrl, width, height) {
    return `<iframe src="${fullUrl}" width="${width}" height="${height}" frameborder="0"></iframe>`
  }
  function validate(config, node) {
    if (!config.selectedDashboardUID || !config.selectedPanelID) {
      const msg = "Must choose dashboard/panel";
      node.error(msg);
      node.status({ fill: "red", shape: "dot", text: msg });
      return;
    }
  }

  function sendData(config, node) {
    validate(config, node)
    grafana.getDashboard(config.selectedDashboardUID).then((dashboard) => {
      const panel = dashboard.dashboard.panels.find(p => p.id == config.selectedPanelID)
      const url = dashboard.meta.url.replace("/d/", "/d-solo/")
      const fullUrl = `https://${teknoir_config.DOMAIN}${url}?orgId=1&panelId=${panel.id}`
      const iframe = utils.renderer().iframe(url, panel.id, config.width, config.height)
      if(panel) {
        node.send({
          payload: {
            dashboard,
            panel,
            iframe,
            fullUrl
          },
        });
        node.status({ fill: "green", shape: "dot", text: "success" });
      }
      else {
        const msg = "Can't find selected panel";
        node.error(msg);
        node.status({ fill: "red", shape: "dot", text: msg });
      }
    });
  }
  
  function Init(config) {
    var node = this;
    RED.nodes.createNode(this, config);

    node.on("input", async function (msg) {
      sendData(config, node)
    });
    sendData(config, node)
  }

  RED.nodes.registerType("grafana-embed-panel", Init);

};
