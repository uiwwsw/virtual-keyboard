// Google Tag Manager loads only after an explicit, browser-local choice.
export function screenForPath(config, input) {
  const path = String(input).split(/[?#]/, 1)[0] || "/";
  return (
    config.routes.find((route) => new RegExp(route.match).test(path)) ?? null
  );
}

export function usagePayload(config, screen, event, destination, placement) {
  if (!screen || !config.routes.includes(screen)) return null;
  return {
    event,
    service_name: config.service,
    screen_name: screen.name,
    page_location: config.origin + screen.path,
    page_title: `${config.service} | ${screen.name}`,
    page_referrer: "",
    navigation_target: destination ?? "",
    navigation_location: placement ?? "",
  };
}

export function navigationDestination(
  config,
  url,
  currentPath,
  currentOrigin = config.origin,
) {
  if (url.origin !== currentOrigin)
    return config.outbound?.find((link) => link.url === url.href)?.name ?? null;
  const screen = screenForPath(config, url.pathname);
  const section =
    url.pathname === currentPath && url.hash
      ? config.sections?.[url.hash.slice(1)]
      : undefined;
  if (!screen || (url.hash && !section && url.pathname === currentPath))
    return null;
  return section ?? screen.name;
}

export function controlDestination(config, value) {
  return config.controls?.includes(value) ? value : null;
}

function start(config) {
  if (!config.hosts.includes(location.hostname) || navigator.doNotTrack === "1")
    return;
  const key = `${config.service}.usage-consent.v1`;
  const container = "GTM-5Q34H7QJ";
  let lastPath = "";
  let historyPath = location.pathname;
  let currentScreen = screenForPath(config, location.pathname);
  const consent = () => {
    try {
      return localStorage.getItem(key);
    } catch {
      return "denied";
    }
  };
  const choose = (value) => {
    try {
      localStorage.setItem(key, value);
      applyConsent();
      host.querySelector("button")?.focus({ preventScroll: true });
    } catch {
      /* Collection remains off. */
    }
  };
  const track = (
    screen = screenForPath(config, location.pathname),
    path = location.pathname,
  ) => {
    currentScreen = screen;
    const allowed = consent() === "granted" && !!screen;
    window["ga-disable-G-TRYJR3PLGB"] = !allowed;
    if (!allowed) {
      lastPath = "";
      return;
    }
    if (lastPath === path) return;
    const payload = usagePayload(config, screen, "page_view");
    window.dataLayer ??= [];
    if (!document.getElementById("movv-usage-gtm")) {
      const { event, ...context } = payload;
      window.dataLayer.push(context, {
        "gtm.start": Date.now(),
        event: "gtm.js",
      });
      const script = document.createElement("script");
      script.id = "movv-usage-gtm";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${container}`;
      document.head.append(script);
    }
    lastPath = path;
    window.dataLayer.push(payload);
  };

  document.addEventListener(
    "click",
    (event) => {
      if (
        consent() !== "granted" ||
        !currentScreen ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const control =
        event.target instanceof Element
          ? event.target.closest("[data-usage-target]")
          : null;
      const target = controlDestination(
        config,
        control?.getAttribute("data-usage-target"),
      );
      if (target) {
        window.dataLayer?.push(
          usagePayload(
            config,
            currentScreen,
            "navigation_select",
            target,
            "control",
          ),
        );
        return;
      }
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (!anchor) return;
      const url = new URL(anchor.href, location.href);
      const destination = navigationDestination(
        config,
        url,
        location.pathname,
        location.origin,
      );
      if (!destination) return;
      const placement = anchor.closest("header")
        ? "header"
        : anchor.closest("footer")
          ? "footer"
          : anchor.closest('nav,[role="navigation"]')
            ? "navigation"
            : "content";
      window.dataLayer?.push(
        usagePayload(
          config,
          currentScreen,
          "navigation_select",
          destination,
          placement,
        ),
      );
    },
    true,
  );

  const routeChanged = () => {
    if (historyPath === location.pathname) return;
    historyPath = location.pathname;
    track();
  };
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      queueMicrotask(routeChanged);
      return result;
    };
  }
  window.addEventListener("popstate", routeChanged);
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) applyConsent();
  });
  // Canvas-based web apps may select a registered screen without sending route IDs.
  window.movvUsage = {
    screen(name) {
      const screen = config.routes.find((route) => route.name === name);
      if (screen) track(screen, `screen:${name}`);
    },
  };

  const english = document.documentElement.lang.startsWith("en");
  const host = document.createElement("aside");
  host.id = "movv-usage-choice";
  host.setAttribute("aria-label", english ? "Usage statistics" : "이용 통계");
  if (Number(config.bottom) >= 64) host.className = "usage-above-nav";
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = config.stylesheet || "/usage-analytics.css";
  host.hidden = true;
  stylesheet.onload = stylesheet.onerror = () => {
    host.hidden = false;
  };
  document.head.append(stylesheet);
  const panel = () => {
    host.replaceChildren();
    const box = document.createElement("div");
    box.className = "usage-panel";
    const text = document.createElement("p");
    text.textContent = english
      ? "Allow Google Analytics to measure page visits, navigation and engagement time? Names, email addresses, search terms and form values are excluded from event parameters."
      : "페이지 방문·메뉴 이동과 참여시간을 Google Analytics로 집계해도 될까요? 이름·이메일·검색어·입력 내용은 이벤트에 담지 않습니다.";
    const deny = document.createElement("button");
    deny.type = "button";
    deny.textContent = english ? "Do not allow" : "허용 안 함";
    deny.onclick = () => choose("denied");
    const allow = document.createElement("button");
    allow.type = "button";
    allow.className = "usage-allow";
    allow.textContent = english ? "Allow" : "허용";
    allow.onclick = () => choose("granted");
    const detail = document.createElement("p");
    detail.className = "usage-detail";
    detail.append(
      english
        ? "Google processes visitor cookies and device information. Change this choice using Usage stats. "
        : "방문 구분 쿠키와 기기 정보가 처리됩니다. 이용 통계 버튼에서 선택을 바꿀 수 있습니다. ",
    );
    const policy = document.createElement("a");
    policy.href = "https://policies.google.com/privacy";
    policy.target = "_blank";
    policy.rel = "noopener noreferrer";
    policy.textContent = english
      ? "Google privacy policy"
      : "Google 개인정보처리방침";
    detail.append(policy);
    box.append(text, deny, allow, detail);
    host.append(box);
  };
  const renderChoice = () => {
    if (consent() === null) {
      panel();
      return;
    }
    host.replaceChildren();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "usage-preference";
    button.textContent = english ? "Usage stats" : "이용 통계";
    button.onclick = panel;
    host.append(button);
  };
  function applyConsent() {
    const allowed = consent() === "granted" && !!currentScreen;
    window["ga-disable-G-TRYJR3PLGB"] = !allowed;
    renderChoice();
    if (allowed) {
      const path = lastPath || location.pathname;
      lastPath = "";
      track(currentScreen, path);
    }
  }
  document.body.append(host);
  applyConsent();
  window.dispatchEvent(new Event("movv-usage-ready"));
}

if (typeof document !== "undefined") {
  const script = document.querySelector("script[data-usage-config]");
  if (script) {
    try {
      start(JSON.parse(script.dataset.usageConfig));
    } catch {
      /* Invalid configuration never enables collection. */
    }
  }
}
