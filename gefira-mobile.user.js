// ==UserScript==
// @name         Gefira mobile efficace
// @description  Améliore l'affichage de Gefira (IRA de Bastia) : menu, actualités, planning, affichage mobile
// @version      1.9
// @updateURL    https://raw.githubusercontent.com/VOTRE-COMPTE-GITHUB/gefira-mobile/main/gefira-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/VOTRE-COMPTE-GITHUB/gefira-mobile/main/gefira-mobile.user.js
// @match        https://extranet-bastia.les-ira.fr/intranet.php*
// @match        https://extranet-bastia.les-ira.fr/index.php*
// @match        https://extranet-bastia.les-ira.fr/
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Réglage : menu de la page Planning
  //   'menu'   : le même menu que sur la page Actualités
  //   'retour' : le menu est remplacé par un bouton « Retour aux actualités »
  // ------------------------------------------------------------------
  const MENU_PLANNING = 'retour';

  // ------------------------------------------------------------------
  // Pages concernées : connexion, accueil (Actualités) et Planning.
  // Les autres pages (Identité, Documents, Parcours…) restent en version ordinateur :
  // elles reçoivent seulement un bouton « Retour aux actualités » tout en haut.
  // ------------------------------------------------------------------
  const estIntranet = location.pathname.endsWith('/intranet.php');
  const page = estIntranet ? new URLSearchParams(location.search).get('page') : null;
  const pageActu = estIntranet && (!page || page === 'actu');
  const pagePlanning = estIntranet && page === 'planning';

  // Bouton « Retour aux actualités » pour les pages laissées en version ordinateur.
  // Fonction autonome (elle ne dépend de rien d'autre dans le script). Le bouton est inséré dans la page,
  // tout en haut, aligné sur le cadre de la page ; il ne dépend donc pas du contenu qui suit.
  function ajouterRetourActualites() {
    if (window.top !== window.self) return;   // pas dans les cadres internes
    const ID = 'gefira-retour';
    const BLEU_FRANCE = '#000091';
    // Page d'ordinateur affichée réduite sur le téléphone : on agrandit le bouton du même facteur
    const k = (navigator.maxTouchPoints > 0)
      ? Math.max(1, window.innerWidth / Math.min(screen.width, screen.height))
      : 1;

    const imp = function (css) {
      return css.split(';').filter(Boolean).map(function (d) { return d + ' !important'; }).join(';');
    };

    // Lien « Actualités » de la page s'il existe, sinon l'adresse de l'accueil
    function adresse() {
      const lien = Array.from(document.querySelectorAll('a[href]')).find(function (a) {
        return !a.closest('#' + ID)
          && a.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === 'actualités'
          && /intranet\.php/.test(a.getAttribute('href') || '');
      });
      return lien ? lien.href : location.origin + '/intranet.php';
    }

    // Aligne la barre sur le cadre de la page (même largeur, même bord gauche)
    function placer(barre) {
      barre.style.cssText = imp('display:block;box-sizing:border-box;width:auto;max-width:none;margin:'
        + Math.round(8 * k) + 'px 0');
      const cadre = document.querySelector('table.bord');
      const r = cadre ? cadre.getBoundingClientRect() : null;
      if (!r || r.width < 100) return;
      const b = barre.getBoundingClientRect();
      barre.style.cssText = imp('display:block;box-sizing:border-box;max-width:none;'
        + 'width:' + Math.round(r.width) + 'px;'
        + 'margin:' + Math.round(8 * k) + 'px 0 ' + Math.round(8 * k) + 'px ' + Math.round(r.left - b.left) + 'px');
    }

    function installer() {
      if (!document.body || document.getElementById(ID)) return;
      const barre = document.createElement('div');
      barre.id = ID;
      const lien = document.createElement('a');
      lien.href = adresse();
      lien.textContent = '‹ Retour aux actualités';
      lien.style.cssText = imp('display:flex;align-items:center;justify-content:center;box-sizing:border-box;'
        + 'width:100%;min-height:' + Math.round(50 * k) + 'px;padding:0 ' + Math.round(14 * k) + 'px;'
        + 'background:' + BLEU_FRANCE + ';color:#ffffff;'
        + 'font:700 ' + Math.round(17 * k) + 'px/1.2 system-ui,"Segoe UI",Roboto,Arial,sans-serif;'
        + 'border-radius:' + Math.round(12 * k) + 'px;text-decoration:none;'
        + 'box-shadow:0 2px 8px rgba(0,0,64,0.25)');
      barre.appendChild(lien);
      document.body.insertBefore(barre, document.body.firstChild);
      placer(barre);
      window.addEventListener('load', function () { placer(barre); });
      let minuteur = null;
      window.addEventListener('resize', function () {
        clearTimeout(minuteur);
        minuteur = setTimeout(function () { placer(barre); }, 300);
      });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installer);
    else installer();
  }

  if (estIntranet && !pageActu && !pagePlanning) {
    ajouterRetourActualites();
    return;
  }
  const estConnexion = location.pathname === '/' || location.pathname.endsWith('/index.php');

  // ------------------------------------------------------------------
  // Outils communs
  // ------------------------------------------------------------------
  function imposer(el, propriete, valeur) {
    el.style.setProperty(propriete, valeur, 'important');
  }

  // Exécute une étape sans jamais casser la page si quelque chose d'inattendu arrive
  function securise(fn) {
    try { fn(); } catch (e) { /* on continue avec les étapes suivantes */ }
  }

  function normaliser(t) {
    return t.replace(/\s+/g, ' ').replace(/’/g, "'").trim().toLowerCase();
  }

  function largeurEcran() {
    return Math.min(document.documentElement.clientWidth, window.innerWidth);
  }

  // Une seule marge pour toute la page : le contenu est à MARGE_PAGE pixels du bord de l'écran,
  // des deux côtés (les tableaux gardent leur traitement à part)
  const MARGE_PAGE = 16;

  // Espace à laisser entre le bord du cadre et le contenu pour obtenir MARGE_PAGE depuis le bord de l'écran
  function margeInterne() {
    const cadre = document.querySelector('table.bord');
    const r = cadre ? cadre.getBoundingClientRect() : null;
    const g = r ? r.left : 4;
    return Math.max(6, Math.min(24, Math.round(MARGE_PAGE - g - 1)));
  }

  // Palette bleue (inspirée de Légifrance / Marianne)
  const BLEU = '#000091';        // bleu France
  const BLEU_NUIT = '#060a38';   // bleu très foncé : remplace tout gris anthracite
  const ROUGE = '#e1000f';       // rouge Marianne (trait de la page active, cours modifiés)
  const BLEU_PALE = '#e8eaff';
  const ENCRE = '#1f2340';       // texte courant
  const FOND_PAGE = '#f3f5fb';
  const CONTOUR = BLEU;          // bordures : le bleu du site
  const POLICE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // Gris sombre « anthracite » : composantes proches les unes des autres et peu lumineuses
  function estGrisSombre(couleur) {
    const m = /rgba?\(([^)]+)\)/.exec(couleur || '');
    if (!m) return false;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(isNaN)) return false;
    const alpha = p.length > 3 ? p[3] : 1;
    if (alpha < 0.5) return false;
    const max = Math.max(p[0], p[1], p[2]);
    const min = Math.min(p[0], p[1], p[2]);
    return max <= 130 && (max - min) <= 18;
  }

  // Remplace par un bleu très foncé les fonds et les bordures gris anthracite de la page
  function assombrirGris() {
    const cotes = ['top', 'right', 'bottom', 'left'];
    document.querySelectorAll('body, body *').forEach(function (el) {
      if (el.closest('#gefira-menu') || el.closest('#gefira-planning') || el.closest('#gefira-entete')) return;
      const c = getComputedStyle(el);
      if (estGrisSombre(c.backgroundColor)) {
        imposer(el, 'background-color', BLEU_NUIT);
      }
      cotes.forEach(function (cote) {
        if (parseFloat(c.getPropertyValue('border-' + cote + '-width')) > 0
          && c.getPropertyValue('border-' + cote + '-style') !== 'none'
          && estGrisSombre(c.getPropertyValue('border-' + cote + '-color'))) {
          imposer(el, 'border-' + cote + '-color', BLEU_NUIT);
        }
      });
    });
  }

  // Cadre de la page : même marge à gauche et à droite (mesurée, pas supposée)
  function recalerCadre(marge) {
    const cadre = document.querySelector('table.bord');
    if (!cadre) return;
    imposer(cadre, 'margin-left', marge + 'px');
    imposer(cadre, 'margin-right', marge + 'px');
    let r = cadre.getBoundingClientRect();
    if (Math.abs(r.left - marge) > 0.5) {
      const actuelle = parseFloat(getComputedStyle(cadre).marginLeft) || 0;
      imposer(cadre, 'margin-left', (actuelle + marge - r.left) + 'px');
      r = cadre.getBoundingClientRect();
    }
    const voulue = largeurEcran() - marge - r.left;
    if (voulue > 100 && Math.abs(r.width - voulue) > 0.5) {
      imposer(cadre, 'width', voulue + 'px');
      imposer(cadre, 'max-width', voulue + 'px');
    }
  }

  // ---------- Gris clair → bleu du site ----------
  function lireCouleur(couleur) {
    const m = /rgba?\(([^)]+)\)/.exec(couleur || '');
    if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  // Gris moyen à clair (le blanc et les gris sombres sont traités ailleurs)
  function estGrisClair(couleur) {
    const c = lireCouleur(couleur);
    if (!c || c.a < 0.5) return false;
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    return max > 130 && max <= 245 && (max - min) <= 10;
  }

  function aDuTexte(el) {
    return Array.from(el.childNodes).some(function (n) {
      return n.nodeType === 3 && n.nodeValue.trim();
    });
  }

  // Texte, bordures et fonds en gris clair : bleu du site (texte blanc sur les fonds convertis)
  function griserVersBleu() {
    const cotes = ['top', 'right', 'bottom', 'left'];
    const fonds = [];
    document.querySelectorAll('body, body *').forEach(function (el) {
      if (el.closest('#gefira-menu') || el.closest('#gefira-planning') || el.closest('#gefira-entete')) return;
      if (/^(SCRIPT|STYLE|IMG|SVG|IFRAME)$/i.test(el.tagName)) return;
      const c = getComputedStyle(el);
      if (estGrisClair(c.color)
        && (aDuTexte(el) || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))) {
        imposer(el, 'color', BLEU);
      }
      cotes.forEach(function (cote) {
        if (parseFloat(c.getPropertyValue('border-' + cote + '-width')) > 0
          && c.getPropertyValue('border-' + cote + '-style') !== 'none'
          && estGrisClair(c.getPropertyValue('border-' + cote + '-color'))) {
          imposer(el, 'border-' + cote + '-color', BLEU);
        }
      });
      if (estGrisClair(c.backgroundColor)) {
        imposer(el, 'background-color', BLEU);
        fonds.push(el);
      }
    });
    fonds.forEach(function (fond) {
      imposer(fond, 'color', '#ffffff');
      fond.querySelectorAll('*').forEach(function (d) {
        if (d.closest('#gefira-menu') || d.closest('#gefira-entete')) return;
        const cd = getComputedStyle(d);
        const bg = lireCouleur(cd.backgroundColor);
        if (bg && bg.a > 0.1) return;
        const t = lireCouleur(cd.color);
        if (t && (0.299 * t.r + 0.587 * t.g + 0.114 * t.b) < 140) imposer(d, 'color', '#ffffff');
      });
    });
  }

  // ---------- Repères de l'en-tête ----------
  // Les éléments du titre « Espace réservé élèves / Attachés d'administration » (les plus profonds)
  function trouverBlocsTitre() {
    const debuts = ['espace réservé', 'attachés administration', "attachés d'administration"];
    const commence = function (el) {
      const t = normaliser(el.textContent);
      return debuts.some(function (d) { return t.indexOf(d) === 0; });
    };
    return Array.from(document.querySelectorAll('body *')).filter(function (el) {
      if (el.closest('#gefira-menu') || el.closest('#gefira-planning') || el.closest('#gefira-entete')) return false;
      if (/^(SCRIPT|STYLE)$/i.test(el.tagName)) return false;
      return commence(el) && !Array.from(el.children).some(commence);
    });
  }

  // Début du contenu : titre des actualités, ou calendrier du planning
  function trouverBorne() {
    const debut = function (el) {
      return normaliser(el.textContent).indexOf("les actualités de l'") === 0;
    };
    const titre = Array.from(document.querySelectorAll('body *')).filter(function (el) {
      return !el.closest('#gefira-menu') && debut(el)
        && !Array.from(el.children).some(debut);
    })[0];
    return titre || document.querySelector('.fc') || document.getElementById('gefira-planning');
  }

  // Le logo de l'IRA : l'image de l'en-tête (de préférence nommée « logo »/« ira »), sinon la plus grande
  function trouverLogo() {
    const menu = document.getElementById('gefira-menu');
    const imgs = Array.from(document.querySelectorAll('body img')).filter(function (im) {
      if (im.closest('#gefira-menu') || im.closest('#gefira-planning') || im.closest('#gefira-entete')) return false;
      if (menu && !(im.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
      const r = im.getBoundingClientRect();
      return r.width >= 30 && r.height >= 20;
    });
    if (!imgs.length) return null;
    const aire = function (im) {
      const r = im.getBoundingClientRect();
      return r.width * r.height;
    };
    const nommes = imgs.filter(function (im) {
      return /logo|ira|bastia/i.test((im.getAttribute('src') || '') + ' ' + (im.alt || ''));
    });
    return (nommes.length ? nommes : imgs).sort(function (a, b) { return aire(b) - aire(a); })[0];
  }

  // Supprime les traits (hr, filets, bordures haut/bas) de l'en-tête situé avant le contenu,
  // sauf ceux qui entourent le logo et le titre
  function retirerLignes() {
    if (document.getElementById('gefira-entete')) return;   // l'en-tête est déjà refait
    const menu = document.getElementById('gefira-menu');
    const borne = trouverBorne();
    if (!menu || !borne) return;
    const logo = trouverLogo();
    const titres = trouverBlocsTitre();

    document.querySelectorAll('body *').forEach(function (el) {
      if (el.closest('#gefira-menu') || el.closest('#gefira-planning') || el.closest('#gefira-entete')) return;
      if (/^(SCRIPT|STYLE|IMG|SVG|A|INPUT|BUTTON)$/i.test(el.tagName)) return;
      if (!(borne.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) return;
      if (el.contains(borne) || el.contains(menu) || (logo && el.contains(logo))) return;
      if (titres.some(function (t) { return t.contains(el) || el.contains(t); })) return;
      if (el.tagName === 'HR') { imposer(el, 'display', 'none'); return; }
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const vide = !el.textContent.trim() && !el.querySelector('img, svg, input, button');
      if (vide && r.height <= 6 && r.width > 40) { imposer(el, 'display', 'none'); return; }
      const c = getComputedStyle(el);
      ['top', 'bottom'].forEach(function (cote) {
        if (parseFloat(c.getPropertyValue('border-' + cote + '-width')) > 0
          && c.getPropertyValue('border-' + cote + '-style') !== 'none') {
          imposer(el, 'border-' + cote + '-style', 'none');
        }
      });
    });
  }

  // ---------- Logo et titre de l'en-tête ----------
  // Marge identique entre le bord de l'écran et le bout du texte, et entre l'autre bord et le bout du logo ;
  // le logo est centré verticalement sur le texte.
  const MARGE_BORD = 12;   // en pixels

  function remettre(el) {
    imposer(el, 'transform', 'none');
    if (el.dataset.gefiraRel) {
      imposer(el, 'left', '0px');
      imposer(el, 'top', '0px');
    }
  }

  function deplacer(el, dx, dy) {
    if (!dx && !dy) return;
    if (getComputedStyle(el).display === 'inline' && el.tagName !== 'IMG') {
      el.dataset.gefiraRel = '1';
      imposer(el, 'position', 'relative');
      imposer(el, 'left', dx + 'px');
      imposer(el, 'top', dy + 'px');
    } else {
      imposer(el, 'transform', 'translate(' + dx + 'px,' + dy + 'px)');
    }
  }

  // Étendue réelle du texte (et non celle des boîtes qui le contiennent)
  function etendueTexte(blocs) {
    let g = Infinity, d = -Infinity, h = Infinity, b = -Infinity;
    blocs.forEach(function (bloc) {
      const marche = document.createTreeWalker(bloc, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = marche.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        const rg = document.createRange();
        rg.selectNodeContents(n);
        Array.from(rg.getClientRects()).forEach(function (q) {
          if (q.width < 1 || q.height < 1) return;
          g = Math.min(g, q.left); d = Math.max(d, q.right);
          h = Math.min(h, q.top); b = Math.max(b, q.bottom);
        });
      }
    });
    return isFinite(g) ? { left: g, right: d, top: h, bottom: b } : null;
  }

  function alignerLogo() {
    if (document.getElementById('gefira-entete')) return;   // l'en-tête est déjà refait
    if (!document.getElementById('gefira-menu')) return;
    const logo = trouverLogo();
    const blocs = trouverBlocsTitre().filter(function (x) { return x.getClientRects().length > 0; });
    if (!logo || !blocs.length) return;

    [logo].concat(blocs).forEach(remettre);
    const rl = logo.getBoundingClientRect();
    const t = etendueTexte(blocs);
    if (!t || !rl.width) return;

    const W = largeurEcran();
    let dxLogo = 0;
    let dxTexte = 0;
    if (Math.abs((rl.left + rl.right) / 2 - (t.left + t.right) / 2) > 4) {
      if ((rl.left + rl.right) < (t.left + t.right)) {   // logo à gauche, texte à droite
        dxLogo = MARGE_BORD - rl.left;
        dxTexte = (W - MARGE_BORD) - t.right;
      } else {                                           // texte à gauche, logo à droite
        dxLogo = (W - MARGE_BORD) - rl.right;
        dxTexte = MARGE_BORD - t.left;
      }
    }
    // Côte à côte : on centre le logo sur la hauteur du texte
    let dyLogo = 0;
    if (rl.right <= t.left + 2 || t.right <= rl.left + 2) {
      dyLogo = (t.top + t.bottom) / 2 - (rl.top + rl.bottom) / 2;
    }
    if (blocs.some(function (x) { return x.contains(logo); })) dxLogo -= dxTexte;   // logo dans le bloc de texte
    if (Math.abs(dxLogo) > W || Math.abs(dxTexte) > W || Math.abs(dyLogo) > 300) return;

    deplacer(logo, dxLogo, dyLogo);
    blocs.forEach(function (x) { deplacer(x, dxTexte, 0); });
  }

  // Supprime le bloc « nom - promotion - FCG » avec ses icônes et ses lignes (sans le remplacer)
  const RE_PROMO = /promotion\s*\d+|\bfcg\s*\d+/i;
  function masquerBlocUtilisateur() {
    if (document.getElementById('gefira-entete')) return;   // l'en-tête est déjà refait
    if (!document.getElementById('gefira-menu')) return;   // on attend le nouveau menu

    // Le bloc se trouve avant le contenu : titre des actualités ou calendrier du planning
    const tous = Array.from(document.querySelectorAll('body *'));
    const borne = trouverBorne();
    if (!borne) return;
    const logo = trouverLogo();

    const feuilles = tous.filter(function (el) {
      if (el.closest('#gefira-menu') || el.closest('#gefira-planning') || el.closest('#gefira-entete')) return false;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
      if (el.textContent.length > 160 || !RE_PROMO.test(el.textContent)) return false;
      if (!(borne.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) return false;
      return !Array.from(el.children).some(function (c) { return RE_PROMO.test(c.textContent); });
    });

    feuilles.forEach(function (f) {
      const cadre = document.querySelector('table.bord');
      let bloc = f;
      while (bloc.parentElement && bloc.parentElement !== document.body && bloc.parentElement !== cadre) {
        const p = bloc.parentElement;
        if (p.querySelector('#gefira-menu, .fc, #gefira-planning')) break;
        if (p.contains(borne)) break;
        if (normaliser(p.textContent).indexOf('espace réservé') >= 0) break;
        if (logo && p.contains(logo)) break;
        bloc = p;
      }
      imposer(bloc, 'display', 'none');
    });
  }

  // ==================================================================
  // EN-TÊTE UNIQUE : logo, titre, icônes (clé, cadenas) et menu, sur une même grille
  // L'ancien en-tête du site est caché ; on n'en garde que ce qui sert.
  // ==================================================================
  const HAUTEUR_LOGO = 58;   // en pixels

  // Début du contenu de la page : le titre des actualités, ou le titre « Emploi du temps »
  function debutContenu() {
    const debut = pagePlanning ? 'emploi du temps' : "les actualités de l'";
    const commence = function (el) { return normaliser(el.textContent).indexOf(debut) === 0; };
    return Array.from(document.querySelectorAll('table.bord *')).filter(function (el) {
      if (/^(SCRIPT|STYLE)$/i.test(el.tagName)) return false;
      if (el.closest('#gefira-menu') || el.closest('#gefira-planning') || el.closest('#gefira-entete')) return false;
      return commence(el) && !Array.from(el.children).some(commence);
    })[0] || null;
  }

  // L'image du logo est plus large que le carré visible : on la recadre sur le carré,
  // à la hauteur voulue, pour que le bord du logo soit bien sur la marge
  function recadrerLogo(img, boite, hauteur) {
    const decouper = function () {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, w, h).data;
        let x0 = w, x1 = -1, y0 = h, y1 = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (d[i + 3] > 20 && Math.min(d[i], d[i + 1], d[i + 2]) < 235) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < x0 || y1 < y0) return;
        const k = hauteur / (y1 - y0 + 1);
        boite.style.width = Math.round((x1 - x0 + 1) * k) + 'px';
        boite.style.height = hauteur + 'px';
        imposer(img, 'position', 'absolute');
        imposer(img, 'object-fit', 'fill');
        imposer(img, 'max-width', 'none');
        imposer(img, 'width', Math.round(w * k) + 'px');
        imposer(img, 'height', Math.round(h * k) + 'px');
        imposer(img, 'left', (-x0 * k) + 'px');
        imposer(img, 'top', (-y0 * k) + 'px');
      } catch (e) { /* image protégée : on garde le recadrage simple */ }
    };
    if (img.complete && img.naturalWidth) decouper();
    else img.addEventListener('load', decouper, { once: true });
  }

  // Une icône déplacée dans l'en-tête : taille fixe, blanche, sans position héritée de l'ancien en-tête
  function reglerIcone(ic) {
    imposer(ic, 'position', 'static');
    imposer(ic, 'transform', 'none');
    imposer(ic, 'float', 'none');
    imposer(ic, 'margin', '0');
    imposer(ic, 'padding', '0');
    imposer(ic, 'display', 'inline-flex');
    imposer(ic, 'align-items', 'center');
    imposer(ic, 'justify-content', 'center');
    imposer(ic, 'width', '22px');
    imposer(ic, 'height', '22px');
    imposer(ic, 'color', '#ffffff');
    imposer(ic, 'fill', '#ffffff');
    imposer(ic, 'font-size', '20px');
    imposer(ic, 'line-height', '1');
    const interieurs = Array.from(ic.querySelectorAll('img, svg, i'));
    if (/^(IMG|SVG|I)$/i.test(ic.tagName)) interieurs.push(ic);
    interieurs.forEach(function (c) {
      imposer(c, 'width', '22px');
      imposer(c, 'height', '22px');
      imposer(c, 'max-width', 'none');
      imposer(c, 'color', '#ffffff');
      imposer(c, 'fill', '#ffffff');
      if (c.tagName === 'IMG') imposer(c, 'filter', 'brightness(0) invert(1)');
    });
  }

  function composerEntete() {
    if (document.getElementById('gefira-entete')) return true;
    const cadre = document.querySelector('table.bord');
    const menu = document.getElementById('gefira-menu');
    const debut = debutContenu();
    if (!cadre || !menu || !debut || !cadre.contains(debut) || !cadre.contains(menu)) return false;
    if (!(menu.compareDocumentPosition(debut) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;

    // 1. Ancien en-tête : tout ce qui précède le début du contenu, à chaque niveau jusqu'au cadre
    const zone = [];
    let cellule = null;
    for (let n = debut; n && n !== cadre; n = n.parentElement) {
      if (n !== debut && !cellule && /^(TD|TH)$/.test(n.tagName)) cellule = n;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) {
        if (/^(SCRIPT|STYLE|LINK|META)$/i.test(s.tagName)) continue;
        if (s.id === 'gefira-planning' || s.id === 'gefira-entete'
          || s.querySelector('#gefira-planning, .fc')) continue;
        zone.push(s);
      }
    }
    if (!cellule) cellule = debut.parentElement;
    if (!cellule || !zone.some(function (z) { return z.contains(menu); })) return false;

    // Le bloc « nom - promotion » est retiré par masquerBlocUtilisateur ; tant qu'il se voit, on attend
    // (au-delà de 2,5 s on continue sans reprendre d'icônes, pour ne pas bloquer la page)
    const promoVisible = zone.some(function (z) {
      return Array.from(z.querySelectorAll('*')).some(function (e) {
        return e.getClientRects().length > 0 && e.textContent.length <= 160 && RE_PROMO.test(e.textContent);
      });
    });
    if (promoVisible && performance.now() < 2500) return false;

    // 2. Ce qu'on garde : logo, titre, icônes
    const logo = trouverLogo();
    const lignesTitre = [];
    trouverBlocsTitre().forEach(function (b) {
      if (!b.getClientRects().length) return;
      const t = b.textContent.replace(/\s+/g, ' ').trim();
      if (t && t.length < 80 && lignesTitre.indexOf(t) < 0) lignesTitre.push(t);
    });

    let icones = [];
    if (!promoVisible) {
      const vus = [];
      zone.forEach(function (z) {
        const tous = Array.from(z.querySelectorAll('a, button, img, svg, i, input[type="image"]'));
        if (/^(A|BUTTON|IMG|SVG|I|INPUT)$/i.test(z.tagName)) tous.push(z);
        tous.forEach(function (el) {
          const lien = el.closest('a, button');
          const bloc = (lien && z.contains(lien)) ? lien : el;
          if (vus.indexOf(bloc) < 0) vus.push(bloc);
        });
      });
      icones = vus.filter(function (el) {
        if (logo && (el === logo || el.contains(logo) || logo.contains(el))) return false;
        if (el.contains(menu) || menu.contains(el)) return false;
        const imgs = Array.from(el.querySelectorAll('img'));
        if (el.tagName === 'IMG') imgs.push(el);
        if (imgs.some(function (im) {
          return /logo|\bira\b|bastia/i.test((im.getAttribute('src') || '') + ' ' + (im.alt || ''));
        })) return false;   // le logo n'est jamais une icône
        if (!el.getClientRects().length) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 6 || r.width > 80 || r.height > 80) return false;
        return normaliser(el.textContent).length <= 3;
      });
      icones = icones.filter(function (a) {
        return !icones.some(function (b) { return b !== a && b.contains(a); });
      });
      if (icones.length > 4) icones = [];
    }

    // 3. Nouvel en-tête : une ligne (logo, titre, icônes), puis le menu, sur la même largeur
    const entete = document.createElement('div');
    entete.id = 'gefira-entete';
    entete.style.cssText = 'display:block;width:auto;box-sizing:border-box;padding:12px 0 6px;font-family:' + POLICE + ';';

    const ligne = document.createElement('div');
    ligne.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:10px;';
    entete.appendChild(ligne);

    const src = logo ? (logo.currentSrc || logo.src) : '';
    if (src) {
      const boite = document.createElement('div');
      boite.style.cssText = 'flex:0 0 auto;position:relative;overflow:hidden;border-radius:6px;'
        + 'width:' + HAUTEUR_LOGO + 'px;height:' + HAUTEUR_LOGO + 'px;';
      const img = document.createElement('img');
      img.alt = 'IRA de Bastia';
      imposer(img, 'display', 'block');
      imposer(img, 'width', '100%');
      imposer(img, 'height', '100%');
      imposer(img, 'max-width', 'none');
      imposer(img, 'object-fit', 'cover');
      imposer(img, 'margin', '0');
      img.src = src;
      boite.appendChild(img);
      ligne.appendChild(boite);
      recadrerLogo(img, boite, HAUTEUR_LOGO);
    }

    const titre = document.createElement('div');
    titre.style.cssText = 'flex:1 1 auto;min-width:0;text-align:left;text-transform:uppercase;'
      + 'letter-spacing:0.02em;font-weight:700;font-size:11.5px;line-height:1.3;color:' + BLEU + ';';
    lignesTitre.forEach(function (t) {
      const d = document.createElement('div');
      d.textContent = t;
      titre.appendChild(d);
    });
    ligne.appendChild(titre);

    if (icones.length) {
      const actions = document.createElement('div');
      actions.id = 'gefira-actions';
      actions.style.cssText = 'flex:0 0 auto;display:flex;align-items:center;gap:10px;'
        + 'background:' + BLEU + ';border-radius:10px;padding:8px 10px;';
      icones.forEach(function (ic) {
        actions.appendChild(ic);   // déplace l'icône d'origine : son lien continue de fonctionner
        reglerIcone(ic);
      });
      ligne.appendChild(actions);
    }

    // 4. Mise en place : le menu est déplacé, l'ancien en-tête est caché
    cellule.insertBefore(entete, cellule.firstChild);
    entete.appendChild(menu);
    zone.forEach(function (z) { imposer(z, 'display', 'none'); });
    return true;
  }

  // Après le titre : on cache les blocs vides (retours à la ligne, espaces) qui laissent un grand vide
  function resserrerApresTitre(debut, cadre) {
    const vide = function (el) {
      if (el.tagName === 'BR') return true;
      return !el.textContent.trim()
        && !el.querySelector('img, svg, input, button, table, iframe, canvas, video, select, textarea');
    };
    for (let n = debut; n && n !== cadre && !/^(TD|TH)$/.test(n.tagName); n = n.parentElement) {
      for (let s = n.nextElementSibling; s; s = s.nextElementSibling) {
        if (/^(SCRIPT|STYLE)$/i.test(s.tagName)) continue;
        if (s.id === 'gefira-planning') return;
        if (!vide(s)) {
          if (parseFloat(getComputedStyle(s).marginTop) > 10) imposer(s, 'margin-top', '10px');
          return;
        }
        imposer(s, 'display', 'none');
      }
    }
  }

  // Une seule marge latérale pour tout le contenu : tous les blocs qui entourent l'en-tête, le titre
  // et le planning perdent leurs marges propres ; seule la cellule du contenu garde la marge commune.
  function uniformiserMarges() {
    const cadre = document.querySelector('table.bord');
    const entete = document.getElementById('gefira-entete');
    if (!cadre || !entete) return;
    const m = margeInterne();
    imposer(cadre, 'border-spacing', '0');
    imposer(cadre, 'padding-left', '0px');
    imposer(cadre, 'padding-right', '0px');

    const plan = document.getElementById('gefira-planning');
    const debut = debutContenu();
    const points = [entete];
    if (plan) points.push(plan);
    if (debut) points.push(debut);

    const cellules = [];
    points.forEach(function (p) {
      let cellule = null;
      for (let a = p.parentElement; a && a !== cadre; a = a.parentElement) {
        if (!cellule && /^(TD|TH)$/.test(a.tagName)) cellule = a;
        ['padding-left', 'padding-right', 'margin-left', 'margin-right'].forEach(function (pr) {
          imposer(a, pr, '0px');
        });
        if (p !== plan) {
          imposer(a, 'padding-top', '0px');
          imposer(a, 'margin-top', '0px');
        }
        imposer(a, 'height', 'auto');
        imposer(a, 'min-height', '0px');
      }
      if (cellule && cellules.indexOf(cellule) < 0) cellules.push(cellule);
    });
    cellules.forEach(function (c) {
      imposer(c, 'padding-left', m + 'px');
      imposer(c, 'padding-right', m + 'px');
    });

    if (debut) {
      imposer(debut, 'margin-top', '10px');
      imposer(debut, 'margin-bottom', '8px');
      if (pageActu) resserrerApresTitre(debut, cadre);
    }
  }

  // Mode du planning : « jour » par défaut, puis le dernier choix (« jour » ou
  // « ordinateur » = vue Semaine) est mémorisé sur l'appareil.
  const CLE_MODE = 'gefira_planning_mode';
  function lireMode() {
    try { return localStorage.getItem(CLE_MODE) || 'jour'; } catch (e) { return 'jour'; }
  }
  function memoriserMode(mode) {
    try { localStorage.setItem(CLE_MODE, mode); } catch (e) { /* stockage indisponible */ }
  }

  // ==================================================================
  // 1. AFFICHAGE MOBILE (connexion + accueil)
  // ==================================================================
  function affichageMobile() {
    document.querySelectorAll('meta[name="viewport"]').forEach(function (m) { m.remove(); });
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, minimum-scale=1';
    document.head.appendChild(meta);

    const regles = estConnexion ? `
      html, body { max-width: 100% !important; overflow-x: hidden !important; }
      table, tbody, thead, tr, th, td {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      div { float: none !important; max-width: 100% !important; box-sizing: border-box !important; }
      input[type=text], input[type=password], input[type=email] {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        font-size: 16px !important;
      }
      img { max-width: 100% !important; height: auto !important; }
      body, p, td, th, li, a, label { font-size: 15px !important; line-height: 1.4 !important; }
      h1, h2, h3, h4 { font-size: 18px !important; color: ${BLEU} !important; }
      html, body { background: ${FOND_PAGE} !important; }
      body, p, td, th, li, label, input, button { font-family: ${POLICE} !important; color: ${ENCRE}; }
      input[type=text], input[type=password], input[type=email] {
        border: 1px solid ${BLEU} !important;
        border-radius: 8px !important;
        padding: 12px !important;
        background: #ffffff !important;
      }
      input[type=submit], input[type=button], button {
        background: ${BLEU} !important;
        color: #ffffff !important;
        border: 0 !important;
        border-radius: 8px !important;
        padding: 12px 18px !important;
        font-size: 16px !important;
        font-weight: bold !important;
      }
    ` : `
      table.bord, table.bord > tbody, table.bord > tbody > tr, table.bord > tbody > tr > td {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      html, body { max-width: 100% !important; overflow-x: hidden !important; }
      table { max-width: 100% !important; }
      img, input, select, textarea { max-width: 100% !important; }
      body, p, td, li, a, label { font-size: 15px !important; line-height: 1.4 !important; }
      h1, h2, h3, h4 { font-size: 18px !important; }
      img { height: auto !important; }
      html, body { background: ${FOND_PAGE} !important; }
      body, p, td, th, li, label { font-family: ${POLICE} !important; color: ${ENCRE}; }
      h1, h2, h3, h4 { color: ${BLEU} !important; }
      table.bord {
        background: #ffffff !important;
        border: 1px solid ${CONTOUR} !important;
        border-radius: 12px !important;
        box-shadow: 0 2px 10px rgba(0, 0, 64, 0.08) !important;
        margin-top: 6px !important;
      }
    `;

    const style = document.createElement('style');
    style.textContent = regles;
    document.head.appendChild(style);
  }

  // ==================================================================
  // 2. MENU (accueil et planning)
  // ==================================================================
  function moduleMenu(typeMenu, pret) {
    const retour = typeMenu === 'retour';
    const LIGNES = retour ? 1 : 3;   // nombre de lignes du menu
    const ECART = 12;                // espace vide entre deux noms de pages (première passe), en pixels
    const MARGE = 4;                 // marge à gauche et à droite du cadre de la page, en pixels
    const TAILLE_MAX = retour ? 18 : 16;           // taille maximale du texte du menu, en pixels
    const FOND = BLEU;               // couleur de fond du menu
    const COULEUR_ACTIF = ROUGE;     // trait sous la page en cours
    const LIB_ACTIF = pagePlanning ? 'planning' : 'actualités';

    const LIBELLES = [
      'actualités', 'identité', 'documents', 'parcours', 'langues',
      'passeport', 'planning', 'absences', 'eng. civique', 'téléchargements'
    ];

    // Force le cadre de la page à occuper la largeur de l'écran
    function elargirCadre() {
      const cadre = document.querySelector('table.bord');
      if (!cadre) return null;
      const x = largeurEcran() - 2 * MARGE;
      imposer(cadre, 'width', x + 'px');
      imposer(cadre, 'min-width', '0');
      imposer(cadre, 'max-width', x + 'px');
      imposer(cadre, 'margin-left', MARGE + 'px');
      imposer(cadre, 'margin-right', MARGE + 'px');
      imposer(cadre, 'box-sizing', 'border-box');
      for (let a = cadre.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        imposer(a, 'min-width', '0');
        imposer(a, 'max-width', 'none');
      }
      recalerCadre(MARGE);
      return cadre;
    }

    // Retrouve, pour chaque nom du menu d'origine, l'élément de la page qui le contient
    function trouverElements() {
      const tous = Array.from(document.querySelectorAll('body *'));
      const trouves = [];
      LIBELLES.forEach(function (lib) {
        const candidats = tous.filter(function (el) {
          if (el.closest('#gefira-menu')) return false;
          if (normaliser(el.textContent) !== lib) return false;
          return !Array.from(el.children).some(function (c) {
            return normaliser(c.textContent) === lib;
          });
        });
        if (candidats.length) trouves.push(candidats[0]);
      });
      return trouves;
    }

    // Le plus petit élément qui contient toutes les entrées : c'est la barre d'origine
    function ancetreCommun(elements) {
      let a = elements[0].parentElement;
      while (a && !elements.every(function (e) { return a.contains(e); })) {
        a = a.parentElement;
      }
      return a;
    }

    // L'entrée de menu directement sous la barre
    function entreeSousBarre(el, barre) {
      let x = el;
      while (x.parentElement && x.parentElement !== barre) x = x.parentElement;
      return x;
    }

    let ajuster = null;

    // Construit le nouveau menu et cache l'ancien
    function construireMenu() {
      if (document.getElementById('gefira-menu')) return;

      const elements = trouverElements();
      if (elements.length < 8) return;

      // Dans l'ordre d'apparition sur la page
      elements.sort(function (a, b) {
        return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
      });

      const barre = ancetreCommun(elements);
      if (!barre) return;

      const entrees = elements.map(function (e) { return entreeSousBarre(e, barre); });
      if (new Set(entrees).size !== entrees.length) return;

      // Ce qu'on affiche : tout le menu, ou seulement « Actualités » en mode retour
      const affiches = retour
        ? elements.filter(function (e) { return normaliser(e.textContent) === 'actualités'; })
        : elements;
      if (!affiches.length) return;

      // Le menu occupe toute la largeur disponible là où il est placé (pas de largeur calculée à part)
      const nav = document.createElement('div');
      nav.id = 'gefira-menu';
      nav.style.cssText = 'display:block;width:auto;max-width:100%;box-sizing:border-box;background:' + FOND + ';margin:0;'
        + 'border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,64,0.25);'
        + 'font-family:' + POLICE + ';padding:' + (retour ? '0' : '3px') + ';';

      const lignes = [];
      for (let k = 0; k < LIGNES; k++) {
        const l = document.createElement('div');
        l.style.cssText = 'display:flex;flex-wrap:nowrap;width:100%;box-sizing:border-box;';
        nav.appendChild(l);
        lignes.push(l);
      }

      const boutons = affiches.map(function (el, i) {
        const b = document.createElement('a');
        b.href = '#';
        const texte = document.createElement('span');
        texte.style.cssText = 'white-space:nowrap;';
        texte.textContent = retour
          ? '‹ Retour aux actualités'
          : el.textContent.replace(/\s+/g, ' ').trim();
        b.appendChild(texte);
        const actif = !retour && normaliser(el.textContent) === LIB_ACTIF;
        b.style.cssText = 'display:flex;align-items:center;justify-content:center;text-align:center;'
          + 'white-space:nowrap;text-decoration:none;box-sizing:border-box;min-width:0;'
          + (retour
            // Un seul bouton, sur toute la largeur du menu
            ? 'flex:1 1 auto;min-height:50px;padding:0 12px;color:#ffffff;font-weight:700;'
            // Cellules de même largeur dans chaque ligne ; la page en cours est soulignée en rouge
            : 'flex:1 1 0;min-height:46px;margin:2px;padding:0 2px;border-radius:9px;'
              + 'color:' + (actif ? '#ffffff' : '#dfe3ff') + ';font-weight:' + (actif ? '800' : '600') + ';'
              + (actif
                ? 'background:rgba(255,255,255,0.16);box-shadow:inset 0 -3px 0 ' + COULEUR_ACTIF + ';'
                : ''));
        b.dataset.css = b.style.cssText;   // style d'origine, pour pouvoir recalculer
        // Un toucher déclenche le lien d'origine
        b.addEventListener('click', function (e) {
          e.preventDefault();
          (el.closest('a') || el).click();
        });
        lignes[Math.min(LIGNES - 1, Math.floor(i * LIGNES / affiches.length))].appendChild(b);
        return b;
      });

      // On cache l'ancien menu et on installe le nouveau à sa place
      entrees.forEach(function (entree) { imposer(entree, 'display', 'none'); });
      imposer(barre, 'display', 'block');
      barre.insertBefore(nav, barre.firstChild);

      function fixer(px) {
        boutons.forEach(function (b) { imposer(b, 'font-size', px + 'px'); });
      }

      // Même taille de texte partout : la plus grande pour laquelle aucun nom ne dépasse de sa cellule
      ajuster = function () {
        if (nav.getBoundingClientRect().width < 50) return;   // menu pas encore visible : au prochain passage
        boutons.forEach(function (b) { b.style.cssText = b.dataset.css; });
        let finale = 6;
        for (let px = 6; px <= TAILLE_MAX; px += 0.5) {
          fixer(px);
          const deborde = boutons.some(function (b) {
            return b.firstChild.offsetWidth > b.clientWidth - 6;
          });
          if (deborde) break;
          finale = px;
        }
        fixer(finale);
      };
      ajuster();
    }

    // Réduit le titre « Espace réservé élèves / Attachés administration » et libère la hauteur de l'en-tête
    function corrigerTitre() {
      if (document.getElementById('gefira-entete')) return;   // l'en-tête est déjà refait
      const debuts = ['espace réservé', 'attachés administration'];
      const commence = function (el) {
        const t = normaliser(el.textContent);
        return debuts.some(function (d) { return t.indexOf(d) === 0; });
      };

      const tous = Array.from(document.querySelectorAll('body *'));
      const blocs = tous.filter(function (el) {
        if (el.closest('#gefira-menu')) return false;
        if (!commence(el)) return false;
        return !Array.from(el.children).some(commence);
      });

      const cadre = document.querySelector('table.bord');
      blocs.forEach(function (bloc) {
        imposer(bloc, 'font-size', '13px');
        imposer(bloc, 'line-height', '18px');
        imposer(bloc, 'margin', '2px 0');
        imposer(bloc, 'padding', '0');

        let a = bloc.parentElement;
        while (a && a !== document.body && a !== cadre && !a.querySelector('#gefira-menu')) {
          imposer(a, 'height', 'auto');
          imposer(a, 'min-height', '0');
          imposer(a, 'max-height', 'none');
          a = a.parentElement;
        }
      });
    }

    function agir() {
      securise(elargirCadre);
      securise(construireMenu);
      securise(masquerBlocUtilisateur);   // d'abord : retire le bloc « nom - promotion »
      securise(composerEntete);           // puis : un seul en-tête (logo, titre, icônes, menu)
      securise(uniformiserMarges);
      securise(function () { if (ajuster) ajuster(); });
      securise(corrigerTitre);
      securise(assombrirGris);
      securise(griserVersBleu);
      securise(retirerLignes);
      securise(function () { recalerCadre(MARGE); });
      securise(alignerLogo);
    }

    // Rotation de l'écran : on recalcule seulement si la largeur a changé
    let largeurVue = largeurEcran();
    let minuteurTaille = null;
    window.addEventListener('resize', function () {
      clearTimeout(minuteurTaille);
      minuteurTaille = setTimeout(function () {
        if (largeurEcran() === largeurVue) return;
        largeurVue = largeurEcran();
        agir();
      }, 300);
    });

    setTimeout(agir, 500);
    setTimeout(function () { agir(); pret(); }, 1500);
  }

  // ==================================================================
  // 3. CONTENU DES ACTUALITÉS (accueil uniquement)
  // ==================================================================
  function moduleActualites(pret) {
    const POLICE_TABLEAU = 14;        // taille du texte dans les tableaux, en pixels
    const ESPACE_CELLULE = '3px 6px'; // espace autour du texte dans chaque case

    const ELEMENTS_TABLEAU = /^(TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|COLGROUP|COL|CAPTION)$/;

    // Le titre « Les actualités de l'IRA de Bastia » : le contenu commence juste après lui
    function trouverTitre() {
      const tous = Array.from(document.querySelectorAll('body *'));
      const commence = function (el) {
        return normaliser(el.textContent).indexOf("les actualités de l'") === 0;
      };
      const candidats = tous.filter(function (el) {
        if (el.closest('#gefira-menu')) return false;
        return commence(el) && !Array.from(el.children).some(commence);
      });
      return candidats[0] || null;
    }

    // La marge de droite d'un bloc est toujours égale à celle de gauche (dans un sens comme dans l'autre)
    function egaliserDroite(el, c) {
      const pg = parseFloat(c.paddingLeft) || 0;
      if (Math.abs((parseFloat(c.paddingRight) || 0) - pg) > 0.5) imposer(el, 'padding-right', pg + 'px');
      const mg = parseFloat(c.marginLeft) || 0;
      if (Math.abs((parseFloat(c.marginRight) || 0) - mg) > 0.5) imposer(el, 'margin-right', mg + 'px');
    }

    function fixerPolice(table, px) {
      imposer(table, 'font-size', px + 'px');
      table.querySelectorAll('*').forEach(function (n) {
        imposer(n, 'font-size', px + 'px');
      });
    }

    // Donne au tableau son propre défilement horizontal
    function envelopper(table) {
      if (table.closest('.gefira-defile')) return;
      const enveloppe = document.createElement('div');
      enveloppe.className = 'gefira-defile';
      enveloppe.style.cssText = 'overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch;'
        + 'box-shadow:inset -8px 0 6px -6px rgba(0,0,145,0.35);';
      table.parentNode.insertBefore(enveloppe, table);
      enveloppe.appendChild(table);
    }

    function traiter() {
      const cadre = document.querySelector('table.bord');
      const titre = trouverTitre();
      if (!cadre || !titre) return;
      const MARGE_LATERALE = margeInterne();   // marge commune, mesurée

      // 1. Marges latérales : on réduit celles des blocs qui entourent le titre
      for (let a = titre.parentElement; a && a !== cadre; a = a.parentElement) {
        const c = getComputedStyle(a);
        ['padding-left', 'padding-right', 'margin-left', 'margin-right'].forEach(function (p) {
          if (parseFloat(c.getPropertyValue(p)) > MARGE_LATERALE) {
            imposer(a, p, MARGE_LATERALE + 'px');
          }
        });
        egaliserDroite(a, c);
      }

      // Largeur disponible pour le contenu
      const rc = cadre.getBoundingClientRect();
      const limiteDroite = Math.min(rc.right, document.documentElement.clientWidth) - MARGE_LATERALE;
      const dispo = rc.width - 2 * MARGE_LATERALE;

      // Tous les éléments situés après le titre
      const contenu = Array.from(cadre.querySelectorAll('*')).filter(function (el) {
        if (titre.contains(el) || el.closest('#gefira-menu')) return false;
        return !!(titre.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      });

      // 2 et 3. Retours à la ligne autorisés, largeurs fixes trop grandes ramenées au cadre
      contenu.forEach(function (el) {
        const c = getComputedStyle(el);
        if (c.whiteSpace === 'nowrap') imposer(el, 'white-space', 'normal');
        imposer(el, 'overflow-wrap', 'break-word');

        if (!ELEMENTS_TABLEAU.test(el.tagName)) {
          imposer(el, 'max-width', '100%');
          imposer(el, 'box-sizing', 'border-box');
          const rect = el.getBoundingClientRect();
          const horsCadre = !el.closest('.gefira-defile') && rect.right > limiteDroite + 1;
          if (rect.width > dispo + 1 || horsCadre) {
            imposer(el, 'width', 'auto');
            imposer(el, 'min-width', '0');
          }
          if (!el.closest('.gefira-defile') && !/^(INPUT|SELECT|TEXTAREA|BUTTON|IMG)$/.test(el.tagName)
            && /^(block|flex|list-item)$/.test(c.display) && c.cssFloat === 'none') {
            egaliserDroite(el, c);
          }
        }
        if (el.tagName === 'IMG') imposer(el, 'height', 'auto');
      });

      // 4. Tableaux de données : texte lisible, défilement horizontal s'ils dépassent du cadre
      contenu.filter(function (el) {
        return el.tagName === 'TABLE' && !el.querySelector('table');
      }).forEach(function (table) {
        if (table.closest('.gefira-defile')) return;

        imposer(table, 'width', 'auto');
        imposer(table, 'min-width', '0');
        imposer(table, 'table-layout', 'auto');
        table.querySelectorAll('td, th').forEach(function (cellule) {
          imposer(cellule, 'padding', ESPACE_CELLULE);
        });
        fixerPolice(table, POLICE_TABLEAU);

        if (table.getBoundingClientRect().right > limiteDroite + 1) {
          envelopper(table);
        }
      });
    }

    function agir() {
      securise(composerEntete);
      securise(uniformiserMarges);
      securise(traiter);
      securise(assombrirGris);
      securise(griserVersBleu);
      securise(masquerBlocUtilisateur);
      securise(retirerLignes);
      securise(function () { recalerCadre(4); });   // 4 = marge du cadre, comme dans le menu
      securise(alignerLogo);
    }

    // On attend que le menu ait élargi le cadre de la page
    setTimeout(agir, 1800);
    setTimeout(function () { agir(); pret(); }, 3000);
  }

  // ==================================================================
  // 4. PLANNING : vue « Jour » par défaut, bouton « Semaine » pour la vue d'origine
  // ==================================================================
  function modulePlanning(modeInitial, pret) {
    const LARGEUR_CALENDRIER = 1238;   // largeur d'ordinateur du calendrier d'origine, en pixels
    const MARGE = 4;                   // marge à gauche et à droite du cadre de la page, en pixels
    const COULEUR_PAR_DEFAUT = '#5aa0e0';

    const norm = function (t) { return t.replace(/\s+/g, ' ').trim(); };

    function creer(balise, css, texte) {
      const e = document.createElement(balise);
      if (css) e.style.cssText = css;
      if (texte !== undefined) e.textContent = texte;
      return e;
    }

    // Les deux boutons « Jour » / « Semaine » : celui de la vue affichée est plein, l'autre est clair.
    // k : facteur d'échelle (la vue Semaine est une page d'ordinateur réduite) ;
    // surJour : action quand on touche « Jour » alors qu'on est déjà en vue Jour.
    function boutonsMode(actif, k, cssZone, surJour, pleineLargeur) {
      const zone = creer('div', 'display:flex;gap:' + (8 * k) + 'px;' + (cssZone || ''));
      [['jour', 'Jour'], ['ordinateur', 'Semaine']].forEach(function (d) {
        const estActif = d[0] === actif;
        const b = creer('button',
          'min-height:' + (44 * k) + 'px;font-size:' + (16 * k) + 'px;font-family:inherit;'
          + 'border-radius:' + (10 * k) + 'px;padding:0 ' + (18 * k) + 'px;'
          + (estActif
            ? 'border:0;color:#fff;background:' + BLEU + ';font-weight:bold;'
              + 'box-shadow:0 2px 6px rgba(0,0,145,0.30);'
            : 'border:1px solid ' + BLEU + ';color:' + BLEU + ';background:#fff;font-weight:600;')
          + (pleineLargeur ? 'flex:1 1 0;' : ''), d[1]);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (estActif) {
            if (d[0] === 'jour' && surJour) surJour();
            return;
          }
          memoriserMode(d[0]);
          location.reload();
        });
        zone.appendChild(b);
      });
      return zone;
    }

    // ---------- Vue « Semaine » : on ne touche à rien, sauf les deux boutons ----------
    if (modeInitial === 'ordinateur') {
      const k = Math.max(1, window.innerWidth / Math.min(screen.width, screen.height));
      document.documentElement.appendChild(boutonsMode('ordinateur', k,
        'position:fixed;top:' + (8 * k) + 'px;left:' + (8 * k) + 'px;z-index:2147483647;',
        null, false));
      return;
    }

    // ---------- Vue « Jour » ----------
    document.querySelectorAll('meta[name="viewport"]').forEach(function (m) { m.remove(); });
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, minimum-scale=1';
    document.head.appendChild(meta);

    const styleJour = document.createElement('style');
    styleJour.textContent = 'html, body { background: ' + FOND_PAGE + ' !important; overflow-x: hidden !important; max-width: 100% !important; }'
      + 'body { font-family: ' + POLICE + ' !important; }'
      + 'table.bord { background: #ffffff !important; border: 1px solid ' + CONTOUR + ' !important;'
      + 'border-radius: 12px !important; box-shadow: 0 2px 10px rgba(0,0,64,0.08) !important;'
      + 'margin-top: 6px !important; }';
    document.head.appendChild(styleJour);

    // Force le cadre de la page à occuper la largeur de l'écran
    function elargirCadre() {
      const cadre = document.querySelector('table.bord');
      if (!cadre) return;
      const x = largeurEcran() - 2 * MARGE;
      imposer(cadre, 'width', x + 'px');
      imposer(cadre, 'min-width', '0');
      imposer(cadre, 'max-width', x + 'px');
      imposer(cadre, 'margin-left', MARGE + 'px');
      imposer(cadre, 'margin-right', MARGE + 'px');
      imposer(cadre, 'box-sizing', 'border-box');
      for (let a = cadre.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        imposer(a, 'min-width', '0');
        imposer(a, 'max-width', 'none');
      }
      recalerCadre(MARGE);
    }
    elargirCadre();
    setTimeout(elargirCadre, 800);
    setTimeout(elargirCadre, 2000);

    let conteneur = null;     // notre affichage jour par jour
    let demarre = false;
    let semaine = null;       // { titre, jours: [ { libelle, aujourdhui, evenements: [...] } ] }
    let indexJour = null;     // jour affiché (null tant qu'on n'a pas choisi)
    let choix = null;         // 'debut', 'fin' ou 'aujourdhui' : jour à afficher après un changement de semaine
    let weekendTraite = false;
    let aujourdhuiTente = false;
    let minuteurRecon = null;

    function estWeekend() {
      const j = new Date().getDay();
      return j === 0 || j === 6;
    }

    // « 26 Octobre — 30 Octobre 2026 » ou « 26 — 30 Octobre 2026 »
    function analyserTitre(titre) {
      let m = titre.match(/(\d{1,2})\s+([^\d—–-]+?)\s*[—–-]\s*(\d{1,2})\s+([^\d—–-]+?)\s+(\d{4})/);
      if (m) {
        return {
          debutJour: Number(m[1]), debutMois: m[2].trim().toLowerCase(),
          finJour: Number(m[3]), finMois: m[4].trim().toLowerCase()
        };
      }
      m = titre.match(/(\d{1,2})\s*[—–-]\s*(\d{1,2})\s+([^\d—–-]+?)\s+(\d{4})/);
      if (m) {
        const mois = m[3].trim().toLowerCase();
        return { debutJour: Number(m[1]), debutMois: mois, finJour: Number(m[2]), finMois: mois };
      }
      return null;
    }

    function moisPour(info, numero) {
      if (!info) return '';
      if (info.debutMois !== info.finMois && info.debutJour > info.finJour && numero >= info.debutJour) {
        return info.debutMois;
      }
      return info.finMois;
    }

    // ---------- Suivi des modifications d'emploi du temps ----------
    // Le script garde, sur cet appareil, la dernière version vue de chaque jour (la « référence »).
    // Si le planning d'un jour diffère de cette référence, le jour est signalé « Cours modifié »,
    // et chaque cours changé affiche, au toucher, la version qu'il remplace. La référence ne
    // change plus tant que le jour n'est pas passé. Les cours qui apparaissent au-delà de deux
    // semaines après aujourd'hui ne comptent pas (l'emploi du temps se remplit au fur et à
    // mesure) : tant que rien n'y est retiré, ils sont intégrés sans bruit à la référence.
    const CLE_REF = 'gefira_planning_ref';
    const HORIZON_JOURS = 14;
    const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout',
      'septembre', 'octobre', 'novembre', 'decembre'];
    let minuteurSuivi = null;

    function lireRef() {
      try { return JSON.parse(localStorage.getItem(CLE_REF) || '{}') || {}; } catch (e) { return {}; }
    }
    function ecrireRef(ref) {
      try { localStorage.setItem(CLE_REF, JSON.stringify(ref)); } catch (e) { /* stockage indisponible */ }
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function cleDate(a, m, j) { return a + '-' + pad(m + 1) + '-' + pad(j); }
    function cleAujourdhui(decalage) {
      const d = new Date();
      d.setDate(d.getDate() + (decalage || 0));
      return cleDate(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function sansAccent(s) {
      return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\./g, '').trim();
    }
    function indexMois(nom) {
      const n = sansAccent(nom);
      const i = MOIS.indexOf(n);
      if (i >= 0) return i;
      if (n.length < 3) return -1;
      return MOIS.findIndex(function (m) { return m.indexOf(n) === 0; });
    }

    // Date d'une colonne sous la forme « 2026-10-28 » (null si le titre n'a pas pu être lu)
    function calculerCle(numero, nomMois, titre, info) {
      const annees = titre.match(/\d{4}/g);
      const mois = indexMois(nomMois || '');
      if (!annees || mois < 0) return null;
      let annee = Number(annees[annees.length - 1]);
      if (info && info.debutMois !== info.finMois && nomMois === info.debutMois) {
        const fin = indexMois(info.finMois);
        if (fin >= 0 && mois > fin) annee--;   // semaine à cheval sur deux années
      }
      return cleDate(annee, mois, numero);
    }

    // Ce qu'on garde d'un cours : horaires, salle, intitulé
    function plat(ev) {
      return { debut: ev.debut, fin: ev.fin, salle: ev.salle, lignes: ev.lignes.slice() };
    }
    function cleEv(ev) {
      return [ev.debut, ev.fin, ev.salle, ev.lignes.join('|')].join('|');
    }
    function minutes(h) {
      const m = /^(\d{1,2})[:h](\d{2})$/.exec(h || '');
      return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
    }

    // Parmi les anciens cours, celui que le nouveau remplace : le plus chevauchant,
    // sinon le même intitulé à un autre horaire (-1 si aucun)
    function meilleurAncien(n, anciens) {
      const dn = minutes(n.debut);
      const fn = minutes(n.fin);
      let meilleur = -1;
      let score = 0;
      anciens.forEach(function (a, i) {
        const da = minutes(a.debut);
        const fa = minutes(a.fin);
        if (isNaN(dn) || isNaN(fn) || isNaN(da) || isNaN(fa)) return;
        const s = Math.min(fn, fa) - Math.max(dn, da);
        if (s > score) { score = s; meilleur = i; }
      });
      if (meilleur >= 0) return meilleur;
      const titre = n.lignes.join('|');
      return anciens.findIndex(function (a) { return titre && a.lignes.join('|') === titre; });
    }

    // Compare la référence (ref) aux cours actuels (cur) :
    // lies = cours nouveaux ou changés avec leur ancienne version (ou null), annules = cours disparus
    function comparer(ref, cur) {
      const clesRef = ref.map(cleEv);
      const clesCur = cur.map(cleEv);
      const ajoutes = cur.filter(function (e) { return clesRef.indexOf(cleEv(e)) < 0; });
      const restants = ref.filter(function (e) { return clesCur.indexOf(cleEv(e)) < 0; });
      const lies = ajoutes.map(function (n) {
        const i = meilleurAncien(n, restants);
        return { nouveau: n, ancien: i >= 0 ? restants.splice(i, 1)[0] : null };
      });
      return { lies: lies, annules: restants };
    }

    // Repère, pour chaque jour de la semaine affichée, ce qui a changé depuis la référence
    function calculerModifs(sem) {
      const ref = lireRef();
      const auj = cleAujourdhui(0);
      const limite = cleAujourdhui(HORIZON_JOURS);
      // Semaine vide : le calendrier n'est sans doute pas encore chargé, on ne conclut rien
      const total = sem.jours.reduce(function (n, j) { return n + j.evenements.length; }, 0);

      sem.jours.forEach(function (j) {
        j.diff = null;
        if (total === 0 || !j.cle || j.cle < auj || !ref[j.cle]) return;
        const d = comparer(ref[j.cle].ev, j.evenements);
        if (!d.lies.length && !d.annules.length) return;
        // Au-delà de deux semaines, des cours qui se remplissent ne sont pas des modifications
        if (j.cle > limite && !d.annules.length) return;
        j.diff = d;
      });
    }

    // Met à jour les références : jours vus pour la première fois, jours lointains qui se
    // remplissent, oubli des jours passés
    function majRef(sem) {
      const ref = lireRef();
      const auj = cleAujourdhui(0);
      const limite = cleAujourdhui(HORIZON_JOURS);

      Object.keys(ref).forEach(function (c) { if (c < auj) delete ref[c]; });

      const total = sem.jours.reduce(function (n, j) { return n + j.evenements.length; }, 0);
      if (total > 0) {
        sem.jours.forEach(function (j) {
          if (!j.cle || j.cle < auj) return;
          const actuel = j.evenements.map(plat);
          if (!ref[j.cle]) {
            ref[j.cle] = { ev: actuel };   // première fois : simple point de départ
          } else if (j.cle > limite) {
            const d = comparer(ref[j.cle].ev, j.evenements);
            if (!d.annules.length) ref[j.cle].ev = actuel;
          }
        });
      }
      ecrireRef(ref);
    }

    // On met à jour les références seulement quand le calendrier est stable depuis quelques secondes
    function planifierSuivi() {
      clearTimeout(minuteurSuivi);
      minuteurSuivi = setTimeout(function () {
        if (!semaine) return;
        majRef(semaine);
        calculerModifs(semaine);
        dessiner();
      }, 3000);
    }

    // Écrit un cours dans une carte : horaire, salle, intitulé
    function remplirCarte(parent, ev, gris, barre) {
      const couleurTexte = gris ? BLEU : ENCRE;
      const couleurHeure = BLEU;
      const deco = barre ? 'text-decoration:line-through;' : '';
      if (ev.debut) {
        const ligneHeure = creer('div',
          'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;');
        ligneHeure.appendChild(creer('span',
          'font-size:18px;font-weight:bold;letter-spacing:0.2px;color:' + couleurHeure + ';' + deco,
          ev.debut + ' – ' + ev.fin));
        if (ev.salle) {
          ligneHeure.appendChild(creer('span',
            'font-size:13px;font-weight:600;background:' + BLEU_PALE + ';'
            + 'color:' + BLEU + ';border-radius:12px;padding:3px 10px;', ev.salle));
        }
        parent.appendChild(ligneHeure);
      }
      ev.lignes.forEach(function (texte) {
        parent.appendChild(creer('div',
          'font-size:15px;color:' + couleurTexte + ';line-height:1.4;' + deco, texte));
      });
    }

    // Ordre d'affichage : par heure de début, sinon dans l'ordre d'origine
    function cleTri(ev, ordre) {
      const m = minutes(ev.debut);
      return (isNaN(m) ? 100000 : m) + ordre / 10000;
    }

    // Lit les cours dans le calendrier d'origine (resté hors de l'écran)
    function lireSemaine(fc) {
      let ths = Array.from(fc.querySelectorAll('table.fc-agenda-days th[class*="fc-col"]'));
      if (!ths.length) ths = Array.from(fc.querySelectorAll('th[class*="fc-col"]'));
      if (!ths.length) return null;

      const colonnes = ths.map(function (th) { return { th: th, r: th.getBoundingClientRect() }; });
      const titreEl = fc.querySelector('.fc-header-title');
      const titre = titreEl ? norm(titreEl.textContent) : '';
      const info = analyserTitre(titre);
      const cleDuJour = cleAujourdhui(0);

      const jours = colonnes.map(function (c) {
        const brut = norm(c.th.textContent);
        const num = brut.match(/(\d{1,2})/);
        const mois = num ? moisPour(info, Number(num[1])) : '';
        const cle = (num && mois) ? calculerCle(Number(num[1]), mois, titre, info) : null;
        return {
          libelle: brut + (mois ? ' ' + mois : ''),
          // « Aujourd'hui » : repéré par le calendrier, ou par la date de l'appareil
          aujourdhui: c.th.classList.contains('fc-today') || (cle !== null && cle === cleDuJour),
          cle: cle,
          diff: null,
          evenements: []
        };
      });

      Array.from(fc.querySelectorAll('.fc-event')).forEach(function (evEl) {
        const r = evEl.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const cx = r.left + r.width / 2;

        let idx = colonnes.findIndex(function (c) { return cx >= c.r.left && cx < c.r.right; });
        if (idx < 0) {
          let meilleur = 0;
          let distance = Infinity;
          colonnes.forEach(function (c, i) {
            const d = Math.abs(cx - (c.r.left + c.r.width / 2));
            if (d < distance) { distance = d; meilleur = i; }
          });
          idx = meilleur;
        }

        const inner = evEl.querySelector('.fc-event-inner') || evEl;
        let lignes = Array.from(inner.children)
          .map(function (c) { return norm(c.textContent); })
          .filter(Boolean);
        if (!lignes.length) {
          const t = norm(inner.textContent);
          if (t) lignes = [t];
        }

        let debut = '';
        let fin = '';
        let salle = '';
        if (lignes.length) {
          const m = lignes[0].match(/^(\d{1,2}[:h]\d{2})\s*[-–]\s*(\d{1,2}[:h]\d{2})(?:\s*[-–]\s*(.+))?$/);
          if (m) {
            debut = m[1];
            fin = m[2];
            salle = m[3] || '';
            lignes = lignes.slice(1);
          }
        }

        let couleur = getComputedStyle(evEl).backgroundColor;
        if (!couleur || couleur === 'transparent' || couleur === 'rgba(0, 0, 0, 0)') {
          couleur = COULEUR_PAR_DEFAUT;
        }
        if (estGrisClair(couleur)) couleur = BLEU;

        jours[idx].evenements.push({
          haut: r.top, debut: debut, fin: fin, salle: salle, lignes: lignes, couleur: couleur
        });
      });

      jours.forEach(function (j) {
        j.evenements.sort(function (a, b) { return a.haut - b.haut; });
      });
      return { titre: titre, jours: jours };
    }

    // Clique sur un bouton du calendrier d'origine : 'prev', 'next' ou 'today'
    function cliquerOrigine(type) {
      const fc = document.querySelector('.fc');
      const entete = fc && fc.querySelector('table.fc-header, .fc-header');
      if (!entete) return false;
      let cible = entete.querySelector('.fc-button-' + type);
      if (!cible) {
        const mots = {
          prev: ['‹', '◄', '◀', '<', '«', 'précédent', 'prev'],
          next: ['›', '►', '▶', '>', '»', 'suivant', 'next'],
          today: ["aujourd'hui", 'aujourd’hui', 'today']
        };
        const feuilles = Array.from(entete.querySelectorAll('*')).filter(function (e) {
          return e.children.length === 0;
        });
        cible = feuilles.find(function (e) {
          return mots[type].indexOf(norm(e.textContent).toLowerCase()) !== -1;
        });
      }
      if (!cible) return false;
      (cible.closest('.fc-button') || cible).click();
      return true;
    }

    function trouverAujourdhui() {
      return semaine ? semaine.jours.findIndex(function (j) { return j.aujourdhui; }) : -1;
    }

    function jourSuivant() {
      if (!semaine) return;
      if (indexJour < semaine.jours.length - 1) {
        indexJour++;
        dessiner();
      } else {
        choix = 'debut';
        cliquerOrigine('next');
      }
    }

    function jourPrecedent() {
      if (!semaine) return;
      if (indexJour > 0) {
        indexJour--;
        dessiner();
      } else {
        choix = 'fin';
        cliquerOrigine('prev');
      }
    }

    // Bouton « Jour » : le jour en cours, ou le lundi suivant si on est samedi ou dimanche
    function allerAujourdhui() {
      if (!semaine) return;
      if (estWeekend()) {
        choix = 'debut';
        cliquerOrigine('today');   // sans effet si on est déjà sur la semaine en cours
        cliquerOrigine('next');
        return;
      }
      const i = trouverAujourdhui();
      if (i >= 0) {
        indexJour = i;
        dessiner();
        return;
      }
      choix = 'aujourdhui';
      cliquerOrigine('today');
    }

    // Dessine le jour sélectionné
    function dessiner() {
      if (!conteneur) return;
      while (conteneur.firstChild) conteneur.removeChild(conteneur.firstChild);

      if (!semaine) {
        conteneur.appendChild(creer('div',
          'padding:16px;text-align:center;color:' + BLEU + ';font-size:15px;', 'Chargement du planning…'));
        return;
      }

      const jour = semaine.jours[indexJour];
      const bouton = function (texte, action, css) {
        const b = creer('button',
          'min-height:48px;font-size:16px;font-family:inherit;border:0;border-radius:12px;'
          + 'background:' + BLEU + ';color:#fff;padding:0 12px;'
          + 'box-shadow:0 2px 6px rgba(0,0,145,0.28);' + (css || ''), texte);
        b.type = 'button';
        b.addEventListener('click', action);
        return b;
      };

      const haut = creer('div', 'display:flex;gap:8px;align-items:stretch;margin-bottom:10px;');
      haut.appendChild(bouton('‹', jourPrecedent, 'flex:0 0 56px;font-size:26px;'));
      const centre = creer('div',
        'flex:1 1 auto;text-align:center;display:flex;flex-direction:column;'
        + 'justify-content:center;align-items:center;gap:3px;');
      centre.appendChild(creer('div',
        'font-size:20px;font-weight:800;color:' + BLEU + ';text-transform:capitalize;', jour.libelle));
      if (!jour.aujourdhui) {
        centre.appendChild(creer('div', 'font-size:13px;color:' + BLEU + ';', semaine.titre));
      }
      haut.appendChild(centre);
      haut.appendChild(bouton('›', jourSuivant, 'flex:0 0 56px;font-size:26px;'));
      conteneur.appendChild(haut);

      conteneur.appendChild(boutonsMode('jour', 1, 'margin-bottom:16px;', allerAujourdhui, true));

      if (jour.diff) {
        conteneur.appendChild(creer('div',
          'color:#e1000f;font-weight:bold;font-size:16px;margin:0 0 10px;', 'Cours modifié'));
      }

      const annules = jour.diff ? jour.diff.annules : [];
      if (!jour.evenements.length && !annules.length) {
        conteneur.appendChild(creer('div',
          'padding:24px 8px;text-align:center;color:' + BLEU + ';font-size:16px;', 'Aucun cours ce jour.'));
        return;
      }

      // Cours modifiés : clé du nouveau cours → { nouveau, ancien }
      const modifies = {};
      if (jour.diff) {
        jour.diff.lies.forEach(function (l) { modifies[cleEv(l.nouveau)] = l; });
      }

      // Les cours du calendrier, plus ceux qui ont été annulés
      const elements = jour.evenements.map(function (ev, i) {
        return { ev: ev, annule: false, tri: cleTri(ev, i) };
      }).concat(annules.map(function (ev, i) {
        return { ev: ev, annule: true, tri: cleTri(ev, 1000 + i) };
      }));
      elements.sort(function (a, b) { return a.tri - b.tri; });

      elements.forEach(function (el) {
        const ev = el.ev;
        const lien = el.annule ? null : modifies[cleEv(ev)];
        const couleur = el.annule ? '#e1000f' : ev.couleur;
        const carte = creer('div',
          'background:#fff;border:1px solid ' + CONTOUR + ';border-left:6px solid ' + couleur + ';'
          + 'border-radius:12px;padding:12px 14px;margin-bottom:12px;'
          + 'box-shadow:0 2px 6px rgba(0,0,64,0.08);'
          + (el.annule ? 'opacity:0.8;' : ''));

        if (el.annule) {
          carte.appendChild(creer('div',
            'color:#e1000f;font-size:13px;font-weight:bold;margin-bottom:4px;', 'Cours annulé'));
        }
        remplirCarte(carte, ev, false, el.annule);

        if (lien) {
          // Cours modifié : au toucher, on affiche la version remplacée
          const etiquette = creer('div',
            'color:#e1000f;font-size:13px;font-weight:bold;margin-bottom:4px;', 'Cours modifié ▾');
          carte.insertBefore(etiquette, carte.firstChild);

          const detail = creer('div',
            'display:none;margin-top:8px;padding-top:8px;border-top:1px dashed ' + BLEU + ';');
          detail.appendChild(creer('div',
            'font-size:13px;font-weight:bold;color:' + BLEU + ';margin-bottom:4px;', 'remplacé :'));
          if (lien.ancien) {
            remplirCarte(detail, lien.ancien, true, false);
          } else {
            detail.appendChild(creer('div', 'font-size:15px;color:' + BLEU + ';', 'aucun cours prévu'));
          }
          carte.appendChild(detail);

          carte.style.cursor = 'pointer';
          carte.addEventListener('click', function () {
            const ouvert = detail.style.display !== 'none';
            detail.style.display = ouvert ? 'none' : 'block';
            etiquette.textContent = 'Cours modifié ' + (ouvert ? '▾' : '▴');
          });
        }
        conteneur.appendChild(carte);
      });
    }

    // Relit le calendrier d'origine et met à jour l'affichage
    function reconstruire() {
      const fc = document.querySelector('.fc');
      if (!fc) return;
      const lue = lireSemaine(fc);
      if (!lue) return;
      semaine = lue;
      calculerModifs(semaine);
      planifierSuivi();
      const n = semaine.jours.length;

      if (choix === 'debut') {
        indexJour = 0;
        choix = null;
      } else if (choix === 'fin') {
        indexJour = n - 1;
        choix = null;
      } else if (choix === 'aujourdhui') {
        const i = trouverAujourdhui();
        indexJour = i >= 0 ? i : 0;
        choix = null;
      } else if (indexJour === null) {
        if (estWeekend() && !weekendTraite) {
          // Samedi ou dimanche : on ouvre le lundi de la semaine suivante
          weekendTraite = true;
          indexJour = 0;
          choix = 'debut';
          if (cliquerOrigine('next')) return;
          choix = null;
        } else {
          const i = trouverAujourdhui();
          if (i >= 0) {
            indexJour = i;
          } else if (!estWeekend() && !aujourdhuiTente) {
            // Le calendrier n'affiche pas la semaine en cours : on y revient
            aujourdhuiTente = true;
            choix = 'aujourdhui';
            if (cliquerOrigine('today')) {
              // Si le calendrier ne change pas, on relit quand même au bout d'un instant
              setTimeout(reconstruire, 900);
              return;
            }
            choix = null;
            indexJour = 0;
          } else {
            indexJour = 0;
          }
        }
      }

      if (indexJour >= n) indexJour = n - 1;
      if (indexJour < 0) indexJour = 0;
      dessiner();
      pret();   // le planning est prêt : la page peut être dévoilée
    }

    function planifier() {
      clearTimeout(minuteurRecon);
      minuteurRecon = setTimeout(reconstruire, 300);
    }

    function lancer(fc) {
      demarre = true;

      // Le calendrier d'origine reste actif, hors de l'écran, avec sa largeur d'ordinateur
      imposer(fc, 'position', 'absolute');
      imposer(fc, 'left', '-20000px');
      imposer(fc, 'top', '0');
      imposer(fc, 'width', LARGEUR_CALENDRIER + 'px');
      imposer(fc, 'max-width', 'none');
      imposer(fc, 'visibility', 'hidden');
      imposer(fc, 'pointer-events', 'none');

      conteneur = creer('div',
        'display:block;width:100%;max-width:100%;box-sizing:border-box;padding:8px 0;'
        + 'font-family:' + POLICE + ';color:' + ENCRE + ';');
      conteneur.id = 'gefira-planning';
      fc.parentNode.insertBefore(conteneur, fc);
      dessiner();

      // Glissement du doigt : à gauche = jour suivant, à droite = jour précédent
      let x0 = 0;
      let y0 = 0;
      conteneur.addEventListener('touchstart', function (e) {
        const t = e.touches[0];
        x0 = t.clientX;
        y0 = t.clientY;
      }, { passive: true });
      conteneur.addEventListener('touchend', function (e) {
        const t = e.changedTouches[0];
        const dx = t.clientX - x0;
        const dy = t.clientY - y0;
        if (Math.abs(dx) > 70 && Math.abs(dy) < 45) {
          if (dx < 0) jourSuivant();
          else jourPrecedent();
        }
      }, { passive: true });

      // On demande au calendrier de se recalculer à sa largeur d'ordinateur
      window.dispatchEvent(new Event('resize'));

      new MutationObserver(planifier).observe(fc, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['style', 'class']
      });
      setTimeout(reconstruire, 500);
      setTimeout(reconstruire, 1800);
    }

    // On attend que le calendrier soit présent sur la page
    const attente = setInterval(function () {
      const fc = document.querySelector('.fc');
      if (!fc) return;
      clearInterval(attente);
      try {
        lancer(fc);
      } catch (e) { /* on ne casse pas la page si quelque chose d'inattendu arrive */ }
    }, 150);

    // Si le calendrier n'apparaît jamais, on propose de revenir à la vue d'origine
    setTimeout(function () {
      if (demarre) return;
      clearInterval(attente);
      const b = creer('button',
        'position:fixed;top:8px;left:8px;right:8px;z-index:2147483647;font-size:15px;padding:12px;'
        + 'background:' + BLEU + ';color:#fff;border:0;border-radius:10px;',
        'Planning non reconnu : toucher pour afficher la semaine');
      b.type = 'button';
      b.addEventListener('click', function () {
        memoriserMode('ordinateur');
        location.reload();
      });
      document.documentElement.appendChild(b);
    }, 20000);
  }

  // ------------------------------------------------------------------
  // Lancement
  // ------------------------------------------------------------------
  // La page reste blanche tant que la nouvelle mise en page n'est pas
  // prête, pour ne pas montrer l'ancienne. Sécurité : elle est dévoilée au bout de DELAI_MAX.
  const DELAI_MAX = 8000;   // en millisecondes

  const modePlanning = pagePlanning ? lireMode() : null;
  // En vue « Semaine », la page d'origine reste intacte : rien à masquer
  const masquer = estConnexion || pageActu || (pagePlanning && modePlanning !== 'ordinateur');

  let masque = null;
  let restant = 0;

  function reveler() {
    if (masque) { masque.remove(); masque = null; }
  }

  // Chaque module déclare ce qu'il attend ; la page est dévoilée quand tout est prêt
  function declarerAttente() {
    restant++;
    let fait = false;
    return function () {
      if (fait) return;
      fait = true;
      restant--;
      if (restant <= 0) setTimeout(function () { if (restant <= 0) reveler(); }, 80);
    };
  }

  function auDomPret(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  if (masquer) {
    masque = document.createElement('style');
    masque.textContent = 'html{background:#fff !important}body{visibility:hidden !important}';
    (document.head || document.documentElement).appendChild(masque);
    setTimeout(reveler, DELAI_MAX);
  }

  auDomPret(function () {
    if (estConnexion || pageActu) {
      const pret = declarerAttente();
      affichageMobile();
      pret();
    }

    if (pageActu) {
      moduleMenu('menu', declarerAttente());
      moduleActualites(declarerAttente());
    }

    if (pagePlanning) {
      if (modePlanning !== 'ordinateur') moduleMenu(MENU_PLANNING, declarerAttente());
      modulePlanning(modePlanning, declarerAttente());
    }
  });
})();
