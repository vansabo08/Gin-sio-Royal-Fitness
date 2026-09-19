/* =========================================================
   ROYAL FITNESS — main.js
   Corre primeiro o que não depende de bibliotecas (menu, nav,
   vídeo, horário, galeria, formulário). O movimento (Lenis +
   GSAP) liga-se depois, só se o CDN respondeu e o visitante
   não pediu movimento reduzido.
   ========================================================= */
(() => {
  'use strict';

  const doc = document.documentElement;
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WHATSAPP = '244995614652';
  const linkWhatsApp = (mensagem) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
  const OURO = '#C9A227';
  const OSSO = '#F5F2EC';

  let lenis = null;
  let gsapPronto = null;          // { gsap, ScrollTrigger } quando o movimento está ligado

  /* Mesma curva do CSS: cubic-bezier(0.16, 1, 0.3, 1) */
  const curva = (x1, y1, x2, y2) => {
    const a = (p1, p2) => 1 - 3 * p2 + 3 * p1;
    const b = (p1, p2) => 3 * p2 - 6 * p1;
    const c = (p1) => 3 * p1;
    const valor = (t, p1, p2) => ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t;
    const derivada = (t, p1, p2) => 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1);
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const d = derivada(t, x1, x2);
        if (Math.abs(d) < 1e-6) break;
        t -= (valor(t, x1, x2) - x) / d;
      }
      return valor(Math.min(1, Math.max(0, t)), y1, y2);
    };
  };
  const EASE = curva(0.16, 1, 0.3, 1);

  /* Recalcula as posições do scroll quando a altura da página muda */
  let pedidoRefresh = 0;
  const pedirRefresh = () => {
    if (!gsapPronto) return;
    clearTimeout(pedidoRefresh);
    pedidoRefresh = setTimeout(() => gsapPronto.ScrollTrigger.refresh(), 120);
  };


  /* ---------------------------------------------------------
     1. LOADER — o CSS anima e sai sozinho; aqui só se retira
     --------------------------------------------------------- */
  const loader = document.querySelector('.loader');
  if (loader) {
    let saiu = false;
    const retirar = () => {
      if (saiu) return;
      saiu = true;
      loader.remove();
      doc.classList.add('carregado');
    };
    loader.addEventListener('animationend', (e) => {
      if (e.animationName === 'loader-sai') retirar();
    });
    setTimeout(retirar, 1500);
  }

  document.querySelectorAll('[data-ano]').forEach((el) => { el.textContent = new Date().getFullYear(); });


  /* ---------------------------------------------------------
     2. NAV — fundo com blur depois de 100px e link activo
     --------------------------------------------------------- */
  const cabecalho = document.querySelector('.cabecalho');
  let pedidoNav = 0;
  const marcarCabecalho = () => {
    pedidoNav = 0;
    cabecalho.classList.toggle('cabecalho--solido', window.scrollY > 100);
  };
  window.addEventListener('scroll', () => {
    if (!pedidoNav) pedidoNav = requestAnimationFrame(marcarCabecalho);
  }, { passive: true });
  // No próximo frame: ler scrollY agora obrigava a refazer o layout da página a meio do script
  pedidoNav = requestAnimationFrame(marcarCabecalho);

  const linksNav = [...document.querySelectorAll('.nav__link')];
  const seccoesNav = linksNav
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (seccoesNav.length && 'IntersectionObserver' in window) {
    const visiveis = new Set();
    const espiao = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)));
      const ativa = seccoesNav.filter((s) => visiveis.has(s)).pop();
      linksNav.forEach((link) => {
        const ligado = Boolean(ativa) && link.getAttribute('href') === '#' + ativa.id;
        link.classList.toggle('is-ativo', ligado);
        if (ligado) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    seccoesNav.forEach((s) => espiao.observe(s));
  }


  /* ---------------------------------------------------------
     3. MENU DE ECRÃ INTEIRO
     --------------------------------------------------------- */
  const hamburger = document.querySelector('.hamburger');
  const menu = document.getElementById('menu');

  const focaveis = () => [...menu.querySelectorAll('a[href], button:not([disabled])')];

  const abrirMenu = () => {
    menu.hidden = false;
    void menu.offsetHeight;                       // deixa a transição arrancar do estado fechado
    menu.classList.add('is-aberto');
    doc.classList.add('menu-aberto');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Fechar menu');
    if (lenis) lenis.stop();
    const primeiro = focaveis()[0];
    if (primeiro) setTimeout(() => primeiro.focus({ preventScroll: true }), 300);
  };

  const fecharMenu = (devolverFoco = true) => {
    menu.classList.remove('is-aberto');
    doc.classList.remove('menu-aberto');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Abrir menu');
    if (lenis) lenis.start();
    const esconder = () => { if (!menu.classList.contains('is-aberto')) menu.hidden = true; };
    menu.addEventListener('transitionend', function fim(e) {
      if (e.target !== menu) return;
      menu.removeEventListener('transitionend', fim);
      esconder();
    });
    setTimeout(esconder, 1000);
    if (devolverFoco) hamburger.focus({ preventScroll: true });
  };

  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      if (hamburger.getAttribute('aria-expanded') === 'true') fecharMenu();
      else abrirMenu();
    });

    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) fecharMenu(false);
    });

    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('is-aberto')) return;
      if (e.key === 'Escape') {
        fecharMenu();
        return;
      }
      if (e.key !== 'Tab') return;
      const lista = [hamburger, ...focaveis()];
      const i = lista.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        lista[lista.length - 1].focus();
      } else if (!e.shiftKey && i === lista.length - 1) {
        e.preventDefault();
        lista[0].focus();
      }
    });

    window.matchMedia('(min-width: 1024px)').addEventListener('change', (mq) => {
      if (mq.matches && menu.classList.contains('is-aberto')) fecharMenu(false);
    });
  }


  /* ---------------------------------------------------------
     4. VÍDEO DO HERO
     --------------------------------------------------------- */
  const hero = document.querySelector('.hero');
  const video = document.querySelector('.hero__video');
  const botaoPausa = document.querySelector('.hero__pausa');
  let pausadoPeloVisitante = false;

  const marcarPausa = (pausado) => {
    if (!botaoPausa) return;
    botaoPausa.setAttribute('aria-pressed', String(pausado));
    botaoPausa.setAttribute('aria-label', pausado ? 'Reproduzir vídeo de fundo' : 'Pausar vídeo de fundo');
  };

  if (video) {
    const poupaDados = navigator.connection && navigator.connection.saveData;
    let heroVisivel = true;
    let liberado = false;
    const tocar = () => {
      if (!liberado || pausadoPeloVisitante || !heroVisivel) return;
      video.play().catch(() => {});
    };

    if (movimentoReduzido || poupaDados) {
      pausadoPeloVisitante = true;
      marcarPausa(true);
    }

    // O vídeo só começa a descarregar depois da página, para não roubar rede ao primeiro ecrã
    const liberar = () => {
      if (liberado) return;
      liberado = true;
      video.preload = 'auto';
      tocar();
    };
    // Arranca pouco depois de a página acabar, ou logo que o visitante mexa
    const esperarLoad = () => setTimeout(liberar, 2500);
    if (document.readyState === 'complete') esperarLoad();
    else window.addEventListener('load', esperarLoad, { once: true });
    ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach((tipo) => {
      window.addEventListener(tipo, liberar, { once: true, passive: true });
    });
    setTimeout(liberar, 6000);

    if (botaoPausa) {
      botaoPausa.addEventListener('click', () => {
        if (video.paused) {
          pausadoPeloVisitante = false;
          liberado = true;
          video.preload = 'auto';
          video.play().catch(() => {});
          marcarPausa(false);
        } else {
          pausadoPeloVisitante = true;
          video.pause();
          marcarPausa(true);
        }
      });
    }

    // Fora do ecrã o vídeo pára, para não gastar bateria nas secções de baixo
    if ('IntersectionObserver' in window && hero) {
      new IntersectionObserver(([entrada]) => {
        heroVisivel = entrada.isIntersecting;
        if (heroVisivel) tocar();
        else video.pause();
      }, { threshold: 0.02 }).observe(hero);
    }
  }


  /* ---------------------------------------------------------
     5. JANELAS (lightbox da galeria e vídeo da nossa história)
     --------------------------------------------------------- */
  const abrirJanela = (janela) => {
    if (typeof janela.showModal !== 'function') return false;
    janela.showModal();
    doc.classList.add('dialogo-aberto');
    if (lenis) lenis.stop();
    return true;
  };
  document.querySelectorAll('dialog.lightbox').forEach((janela) => {
    janela.addEventListener('close', () => {
      doc.classList.remove('dialogo-aberto');
      if (lenis) lenis.start();
      const v = janela.querySelector('video');
      if (v) v.pause();
    });
    // Clicar fora da foto fecha
    janela.addEventListener('click', (e) => {
      if (e.target === janela || e.target.classList.contains('lightbox__figura')) janela.close();
    });
    janela.querySelectorAll('.lightbox__fechar').forEach((b) => b.addEventListener('click', () => janela.close()));
  });

  // Vídeo
  const janelaVideo = document.getElementById('lightbox-video');
  document.querySelectorAll('[data-abrir-video]').forEach((botao) => {
    botao.addEventListener('click', () => {
      if (!janelaVideo || !abrirJanela(janelaVideo)) return;
      const v = janelaVideo.querySelector('video');
      v.currentTime = 0;
      v.play().catch(() => {});
    });
  });

  // Galeria
  const lightbox = document.getElementById('lightbox');
  const fotos = [...document.querySelectorAll('.galeria__botao')];
  if (lightbox && fotos.length) {
    const img = lightbox.querySelector('.lightbox__img');
    const legenda = lightbox.querySelector('.lightbox__legenda');
    const contador = lightbox.querySelector('.lightbox__contador');
    let atual = 0;

    const mostrarFoto = (indice) => {
      atual = (indice + fotos.length) % fotos.length;
      const b = fotos[atual];
      img.src = b.dataset.grande;
      img.width = Number(b.dataset.largura);
      img.height = Number(b.dataset.altura);
      img.alt = b.dataset.legenda;
      const titulo = document.createElement('span');
      titulo.textContent = b.dataset.legenda;
      const credito = document.createElement('small');
      credito.textContent = b.dataset.credito;
      legenda.replaceChildren(titulo, credito);
      contador.textContent = `${String(atual + 1).padStart(2, '0')} / ${String(fotos.length).padStart(2, '0')}`;
    };

    fotos.forEach((b, i) => b.addEventListener('click', () => {
      mostrarFoto(i);
      abrirJanela(lightbox);
    }));
    lightbox.querySelector('.lightbox__anterior').addEventListener('click', () => mostrarFoto(atual - 1));
    lightbox.querySelector('.lightbox__seguinte').addEventListener('click', () => mostrarFoto(atual + 1));
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') mostrarFoto(atual - 1);
      if (e.key === 'ArrowRight') mostrarFoto(atual + 1);
    });

    // Deslizar o dedo muda de foto
    let inicioX = null;
    lightbox.addEventListener('pointerdown', (e) => { inicioX = e.clientX; });
    lightbox.addEventListener('pointerup', (e) => {
      if (inicioX === null) return;
      const dx = e.clientX - inicioX;
      inicioX = null;
      if (Math.abs(dx) > 60) mostrarFoto(atual + (dx < 0 ? 1 : -1));
    });
  }


  /* ---------------------------------------------------------
     6. HORÁRIO — filtro por dia
     --------------------------------------------------------- */
  const horario = document.querySelector('.horario');
  const realcar = { linhas: () => {}, geral: () => {} };

  if (horario) {
    const lista = horario.querySelector('.dias');
    const separadores = [...horario.querySelectorAll('.dia')];
    const tabela = horario.querySelector('.tabela');
    const linhas = [...horario.querySelectorAll('tbody tr')];
    const abertoAgora = horario.querySelector('.horario__aberto');
    const ordem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    let diaAtual = ordem[new Date().getDay()];

    lista.hidden = false;
    tabela.classList.add('tabela--filtrada');

    const mostrarDia = (dia, focar = false) => {
      diaAtual = dia;
      separadores.forEach((s) => {
        const escolhido = s.dataset.dia === dia;
        s.setAttribute('aria-selected', String(escolhido));
        s.tabIndex = escolhido ? 0 : -1;
        s.setAttribute('aria-controls', 'tabela-horario');
        if (escolhido && focar) s.focus();
      });
      linhas.forEach((l) => { l.hidden = l.dataset.dia !== dia; });
      const nome = separadores.find((s) => s.dataset.dia === dia);
      tabela.setAttribute('aria-label', `Aulas de ${nome ? nome.textContent : dia}`);
      pedirRefresh();
    };

    separadores.forEach((s) => s.addEventListener('click', () => mostrarDia(s.dataset.dia)));
    lista.addEventListener('keydown', (e) => {
      const i = separadores.findIndex((s) => s.dataset.dia === diaAtual);
      let novo = null;
      if (e.key === 'ArrowRight') novo = (i + 1) % separadores.length;
      if (e.key === 'ArrowLeft') novo = (i - 1 + separadores.length) % separadores.length;
      if (e.key === 'Home') novo = 0;
      if (e.key === 'End') novo = separadores.length - 1;
      if (novo === null) return;
      e.preventDefault();
      mostrarDia(separadores[novo].dataset.dia, true);
    });

    mostrarDia(diaAtual);

    const piscar = (elementos) => {
      elementos.forEach((el) => el.classList.add('is-realcado'));
      setTimeout(() => elementos.forEach((el) => el.classList.remove('is-realcado')), 2600);
    };

    // "Ver horário" de uma modalidade: vai ao dia mais próximo que a tem e realça as aulas
    realcar.linhas = (modalidade) => {
      if (modalidade === 'musculacao') {
        piscar([abertoAgora]);
        return;
      }
      const hoje = ordem.indexOf(ordem[new Date().getDay()]);
      for (let k = 0; k < 7; k++) {
        const dia = ordem[(hoje + k) % 7];
        const doDia = linhas.filter((l) => l.dataset.dia === dia && l.dataset.modalidade === modalidade);
        if (doDia.length) {
          mostrarDia(dia);
          piscar(doDia);
          return;
        }
      }
    };
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-realcar]');
    if (link) setTimeout(() => realcar.linhas(link.dataset.realcar), 250);
  });


  /* ---------------------------------------------------------
     7. FORMULÁRIO → WhatsApp
     --------------------------------------------------------- */
  const formulario = document.querySelector('.formulario');
  if (formulario) {
    const campos = formulario.elements;
    const estado = formulario.querySelector('.formulario__estado');

    const marcarErro = (campo, mensagem) => {
      const erro = document.getElementById(campo.getAttribute('aria-describedby'));
      if (erro) erro.textContent = mensagem;
      if (mensagem) campo.setAttribute('aria-invalid', 'true');
      else campo.removeAttribute('aria-invalid');
      return !mensagem;
    };

    ['nome', 'telefone', 'plano'].forEach((nome) => {
      campos[nome].addEventListener('input', () => marcarErro(campos[nome], ''));
      campos[nome].addEventListener('change', () => marcarErro(campos[nome], ''));
    });

    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = campos.nome.value.trim();
      const telefone = campos.telefone.value.trim();
      const plano = campos.plano.value;

      const ok = [
        marcarErro(campos.nome, nome.length >= 2 ? '' : 'Escreve o teu nome.'),
        marcarErro(campos.telefone, telefone.replace(/\D/g, '').length >= 9 ? '' : 'Escreve um telefone com pelo menos 9 dígitos.'),
        marcarErro(campos.plano, plano ? '' : 'Escolhe um plano, ou "Ainda não sei".')
      ];
      if (ok.includes(false)) {
        const primeiro = [campos.nome, campos.telefone, campos.plano][ok.indexOf(false)];
        primeiro.focus();
        return;
      }

      const mensagem = `Olá, Royal Fitness! Chamo-me ${nome} e quero inscrever-me.\nPlano de interesse: ${plano}\nTelefone: ${telefone}`;
      const url = linkWhatsApp(mensagem);
      window.open(url, '_blank', 'noopener');

      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'abre aqui';
      estado.replaceChildren('Abrimos o WhatsApp com a tua mensagem. Se não abriu, ', link, '.');
    });
  }


  /* ---------------------------------------------------------
     8. MOVIMENTO — Lenis + GSAP ScrollTrigger
     --------------------------------------------------------- */
  /* Revelação e contadores não precisam do GSAP: um só IntersectionObserver e transições CSS */
  revelacoes();
  contadores();

  // Entre cada bloco de animações devolve-se o processador ao browser (menos tarefas longas)
  const ceder = () => new Promise((r) => setTimeout(r, 0));

  /* As secções abaixo da dobra começam com content-visibility: auto (CSS, secção 22), para o
     primeiro ecrã não ter de compor o texto da página toda. Depois libertam-se uma a uma, em
     tarefas curtas, antes de o GSAP medir posições. */
  const libertarSeccoes = async () => {
    for (const secao of document.querySelectorAll('.cv-adiar')) {
      await ceder();
      secao.classList.remove('cv-adiar');
      void secao.offsetHeight;
    }
  };

  const ligarMovimento = async () => {
    const temGsap = window.gsap && window.ScrollTrigger;
    await libertarSeccoes();

    if (!temGsap || movimentoReduzido) {
      ligarAncoras(null);
      return;
    }

    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    gsapPronto = { gsap, ScrollTrigger };

    // Scroll suave
    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((tempo) => lenis.raf(tempo * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    ligarAncoras(lenis);

    // As animações criam-se pela ordem em que aparecem na página
    const blocos = [paralaxeHero, manifesto, faixa, paralaxeMillennium, transformacoes, paralaxeGaleria, paralaxeCta];
    for (const bloco of blocos) {
      await ceder();
      bloco(gsap);
    }
    await ceder();
    ScrollTrigger.refresh();

    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(pedirRefresh);
  };

  /* Hero: o vídeo anda a 0.3x do scroll, o texto a 1x e desvanece */
  function paralaxeHero(gsap) {
    if (!hero) return;
    // Uma só linha do tempo (e um só ScrollTrigger) para as três camadas
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__media', { yPercent: 70, duration: 1 }, 0)
      .to('.hero__fumo', { yPercent: -12, duration: 1 }, 0)
      .fromTo(['.hero__conteudo', '.hero__extras'], { opacity: 1 }, { opacity: 0, duration: 0.55, immediateRender: false }, 0);
  }

  /* Prova social: contam de 0 quando entram no ecrã */
  function contadores() {
    const numeros = [...document.querySelectorAll('[data-contar]')];
    if (movimentoReduzido || !numeros.length || !('IntersectionObserver' in window)) return;
    const formatar = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const contar = (el) => {
      const fim = Number(el.dataset.contar);
      const inicio = performance.now();
      const passo = (agora) => {
        const t = Math.min(1, (agora - inicio) / 1200);
        el.textContent = formatar(fim * EASE(t));
        if (t < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    numeros.forEach((el) => { el.textContent = '0'; });
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        observador.unobserve(e.target);
        contar(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    numeros.forEach((el) => observador.observe(el));
  }

  /* Manifesto: cada palavra acende quando o scroll passa por ela */
  function manifesto(gsap) {
    const p = document.querySelector('[data-manifesto]');
    if (!p) return;
    const fragmento = document.createDocumentFragment();
    const palavras = [];
    const juntar = (texto, chave) => {
      texto.split(/(\s+)/).forEach((parte) => {
        if (!parte) return;
        if (/^\s+$/.test(parte)) {
          fragmento.appendChild(document.createTextNode(' '));
          return;
        }
        const span = document.createElement('span');
        span.className = chave ? 'palavra palavra--chave' : 'palavra';
        span.textContent = parte;
        fragmento.appendChild(span);
        palavras.push(span);
      });
    };
    p.childNodes.forEach((no) => {
      if (no.nodeType === Node.TEXT_NODE) juntar(no.textContent, false);
      else if (no.nodeName === 'EM') juntar(no.textContent, true);
    });
    p.replaceChildren(fragmento);
    p.classList.add('manifesto--dividido');

    gsap.to(palavras, {
      color: (i, el) => (el.classList.contains('palavra--chave') ? OURO : OSSO),
      ease: 'none',
      stagger: 0.1,
      scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 50%', scrub: true }
    });
  }

  /* Faixa FORÇA · DISCIPLINA · RESULTADO · ROYAL: anda sempre e acelera com o scroll */
  function faixa(gsap) {
    const el = document.querySelector('.faixa');
    if (!el) return;
    const trilhos = [...el.querySelectorAll('.faixa__trilho')];
    const colocar = trilhos.map((t) => gsap.quickSetter(t, 'xPercent'));
    const pos = trilhos.map((_, i) => (i % 2 ? -50 : 0));
    let visivel = false;
    let sentido = 1;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(el);
    }
    gsap.ticker.add((tempo, delta) => {
      if (!visivel) return;
      const velocidade = lenis ? lenis.velocity : 0;
      if (velocidade > 0.2) sentido = 1;
      else if (velocidade < -0.2) sentido = -1;
      const passo = (0.012 + Math.min(Math.abs(velocidade), 60) * 0.005) * (delta / 16.67);
      trilhos.forEach((_, i) => {
        const direcao = (i % 2 ? 1 : -1) * sentido;
        pos[i] = gsap.utils.wrap(-50, 0, pos[i] + passo * direcao);
        colocar[i](pos[i]);
      });
    });
  }

  /* Millennium: a foto do centro comercial anda devagar e os blocos a velocidades diferentes */
  function paralaxeMillennium(gsap) {
    const secao = document.querySelector('.millennium');
    if (!secao) return;
    const linha = gsap.timeline({ defaults: { ease: 'none', duration: 1 }, scrollTrigger: { trigger: secao, start: 'top bottom', end: 'bottom top', scrub: true } });
    linha.fromTo('.millennium__fundo', { yPercent: -10 }, { yPercent: 10 }, 0);
    secao.querySelectorAll('[data-velocidade]').forEach((el) => {
      const v = Number(el.dataset.velocidade) || 0;
      linha.fromTo(el, { y: v }, { y: -v }, 0);
    });
  }

  /* Transformações: o scroll vertical empurra os cartões para o lado */
  function transformacoes(gsap) {
    const secao = document.querySelector('.transformacoes');
    if (!secao) return;
    const pista = secao.querySelector('.transformacoes__pista');
    const barra = secao.querySelector('.transformacoes__progresso span');
    secao.classList.add('transformacoes--fixa');
    const distancia = () => Math.max(0, pista.offsetWidth - doc.clientWidth);
    gsap.to(pista, {
      x: () => -distancia(),
      ease: 'none',
      scrollTrigger: {
        trigger: secao,
        start: 'top top',
        end: () => '+=' + distancia(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { if (barra) barra.style.transform = `scaleX(${self.progress})`; }
      }
    });
  }

  /* Galeria: cada foto tem a sua velocidade dentro da moldura */
  function paralaxeGaleria(gsap) {
    const galeria = document.querySelector('.galeria');
    if (!galeria) return;
    const linha = gsap.timeline({ defaults: { ease: 'none', duration: 1 }, scrollTrigger: { trigger: galeria, start: 'top bottom', end: 'bottom top', scrub: true } });
    galeria.querySelectorAll('[data-paralaxe]').forEach((img) => {
      const f = Number(img.dataset.paralaxe) || 1;
      linha.fromTo(img, { yPercent: -6 * f }, { yPercent: 6 * f }, 0);
    });
  }

  /* CTA final: a palavra ROYAL de fundo sobe mais devagar que o texto */
  function paralaxeCta(gsap) {
    const secao = document.querySelector('.cta');
    if (!secao) return;
    gsap.fromTo('.cta__marca', { yPercent: 35 }, {
      yPercent: -35,
      ease: 'none',
      scrollTrigger: { trigger: secao, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  /* Revelação por scroll (o estado inicial está no CSS, secção 21):
     data-revela="titulo" → clip-path de baixo para cima
     data-revela="texto"  → fade + translateY 24px
     Irmãos que entram juntos ficam com 80ms entre si. */
  function revelacoes() {
    const elementos = [...document.querySelectorAll('[data-revela]')];
    const mostrarTodos = () => elementos.forEach((el) => el.classList.add('is-revelado'));
    if (!('IntersectionObserver' in window)) {
      mostrarTodos();
      return;
    }
    const observador = new IntersectionObserver((entradas) => {
      const novos = entradas
        .filter((e) => e.isIntersecting)
        .map((e) => e.target)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      novos.forEach((el, i) => {
        observador.unobserve(el);
        if (i) {
          el.style.transitionDelay = `${i * 80}ms`;
          el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
        }
        el.classList.add('is-revelado');
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    elementos.forEach((el) => observador.observe(el));
  }

  /* Links internos: com Lenis desliza, sem Lenis usa o scroll nativo */
  function ligarAncoras(instancia) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const alvo = document.querySelector(id);
      if (!alvo) return;
      e.preventDefault();
      const destino = id === '#inicio' ? 0 : alvo;
      if (instancia) {
        instancia.scrollTo(destino, {
          offset: destino === 0 ? 0 : -cabecalho.offsetHeight + 1,
          duration: 1.2,
          easing: EASE
        });
      } else if (destino === 0) {
        window.scrollTo({ top: 0, behavior: movimentoReduzido ? 'auto' : 'smooth' });
      } else {
        alvo.scrollIntoView({ behavior: movimentoReduzido ? 'auto' : 'smooth' });
      }
      if (id !== '#inicio') {
        alvo.setAttribute('tabindex', '-1');
        alvo.focus({ preventScroll: true });
      }
      history.replaceState(null, '', id);
    });
  }

  // Um script defer corre com readyState já em "interactive", mas antes dos scripts
  // defer que vêm a seguir; por isso só se arranca de imediato se a página já acabou.
  if (document.readyState === 'complete') {
    ligarMovimento();
  } else {
    document.addEventListener('DOMContentLoaded', ligarMovimento, { once: true });
  }
})();
