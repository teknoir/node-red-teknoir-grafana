const fetch = require("node-fetch");

async function config() {
  NAMESPACE = process.env.NAMESPACE || k8sNamespace();
  return {
    NAMESPACE: NAMESPACE,
    PROJECT_ID: process.env.PROJECT_ID,
    DOMAIN: process.env.DOMAIN,
    GRAFANA_HOST: process.env.GRAFANA_HOST || "grafana",
  };
}

function renderer() {
  return {
    iframe: function (id, url, width, height) {
      return String.raw`
        <div id="${id}-div">
          <iframe src="${url}" width="${width}" height="${height}" frameborder="0"></iframe>
        </div>  
        `
    },
    error: function (id, error)  {
      return `<div id="${id}-div">${error}</div>`
    }
  }
}
/**
 * contains apis for grafana
 * @param {*} host - host of grafana
 * @returns projects array
 */
function grafana(host) {
  const apiUrl = `http://${host}/api`;
  const getAllDashboards = function () {
    return fetch(`${apiUrl}/search?query=%`, {})
      .then((x) => x.json())
  }
  const getDashboard = function (uid) {
    return fetch(`${apiUrl}/dashboards/uid/${uid}`, {})
      .then((x) => x.json());
  }
  const getPanelSoloUrl = function (uid, id, domain) {
    return getDashboard(uid).then((dashboard) => {
      const panel = dashboard.dashboard.panels.find(p => p.id == id)
      if (panel) {
        const url = dashboard.meta.url.replace("/d/", "/d-solo/")
        const fullUrl = `https://${domain}${url}?orgId=1&panelId=${panel.id}`
        return {
          dashboard,
          panel,
          fullUrl
        }
      }
      else {
        return {
          dashboard,
          panel,
        }
      }
    })
  }

  return {
    getAllDashboards,
    getDashboard,
    getPanelSoloUrl
  };
}

module.exports = {
  grafana,
  config,
  renderer
};
