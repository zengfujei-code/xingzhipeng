(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  const splitHeadline = () => {
    document.querySelectorAll('[data-split]').forEach((heading) => {
      const label = heading.innerText.replace(/\s+/g, ' ').trim();
      const nodes = [...heading.childNodes];
      let delay = 0;

      heading.setAttribute('aria-label', label);
      heading.replaceChildren();

      nodes.forEach((node) => {
        if (node.nodeName === 'BR') {
          heading.append(document.createElement('br'));
          return;
        }

        [...(node.textContent || '')].forEach((character) => {
          if (/\s/.test(character)) {
            heading.append(document.createTextNode(character));
            return;
          }

          const span = document.createElement('span');
          span.className = 'char';
          span.textContent = character;
          span.setAttribute('aria-hidden', 'true');
          span.style.setProperty('--char-delay', `${delay * 42}ms`);
          heading.append(span);
          delay += 1;
        });
      });
    });
  };

  const setupReveal = () => {
    const targets = document.querySelectorAll('.reveal');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.12 });

    targets.forEach((target) => observer.observe(target));
  };

  const setupConstellation = () => {
    const canvas = document.getElementById('constellation');
    const hero = document.getElementById('top');
    if (!canvas || !hero) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = false;
    const pointer = { x: 0, y: 0, active: false };
    const nodes = [];

    const seedNodes = () => {
      nodes.length = 0;
      const count = Math.max(14, Math.min(30, Math.round(width / 58)));
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + (index % 3) * 0.37;
        const radius = Math.min(width, height) * (0.18 + ((index * 17) % 28) / 100);
        nodes.push({
          x: width * 0.66 + Math.cos(angle) * radius + Math.sin(index * 4.7) * 24,
          y: height * 0.48 + Math.sin(angle) * radius * 0.72,
          vx: Math.sin(index * 2.13) * 0.075,
          vy: Math.cos(index * 1.73) * 0.055,
          r: index % 7 === 0 ? 3.2 : 1.5 + (index % 3) * 0.45,
          gold: index % 7 === 0
        });
      }
    };

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedNodes();
      draw(true);
    };

    const draw = (staticFrame = false) => {
      context.clearRect(0, 0, width, height);

      nodes.forEach((node, index) => {
        if (!staticFrame && !reducedMotion.matches) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < width * 0.32 || node.x > width * 0.98) node.vx *= -1;
          if (node.y < height * 0.08 || node.y > height * 0.9) node.vy *= -1;
        }

        for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
          const other = nodes[otherIndex];
          const distance = Math.hypot(node.x - other.x, node.y - other.y);
          if (distance > 150) continue;
          context.beginPath();
          context.moveTo(node.x, node.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle = `rgba(0, 113, 227, ${0.16 * (1 - distance / 150)})`;
          context.lineWidth = 0.8;
          context.stroke();
        }

        if (pointer.active) {
          const pointerDistance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
          if (pointerDistance < 190) {
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.lineTo(pointer.x, pointer.y);
            context.strokeStyle = `rgba(255, 188, 40, ${0.24 * (1 - pointerDistance / 190)})`;
            context.lineWidth = 1;
            context.stroke();
          }
        }

        context.beginPath();
        context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        context.fillStyle = node.gold ? 'rgba(255, 190, 42, .82)' : 'rgba(0, 113, 227, .48)';
        context.fill();
      });
    };

    const animate = () => {
      if (!running) return;
      draw();
      frame = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (running || reducedMotion.matches || document.hidden) return;
      running = true;
      animate();
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };

    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointer.active = false; });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    window.addEventListener('resize', resize, { passive: true });
    reducedMotion.addEventListener?.('change', () => {
      stop();
      draw(true);
      start();
    });

    resize();
    start();
  };

  const setupProductTilt = () => {
    const stage = document.getElementById('productStage');
    const product = stage?.querySelector('.mousepad-shell');
    if (!stage || !product || !finePointer.matches || reducedMotion.matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let raf = 0;

    const render = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      product.style.setProperty('--tilt-x', `${currentY}deg`);
      product.style.setProperty('--tilt-y', `${currentX}deg`);
      if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
        raf = window.requestAnimationFrame(render);
      }
    };

    const move = (event) => {
      const rect = stage.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 7;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * -5;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(render);
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(render);
    };

    stage.addEventListener('pointermove', move, { passive: true });
    stage.addEventListener('pointerleave', reset);
  };

  const setupMagneticButtons = () => {
    if (!finePointer.matches || reducedMotion.matches) return;
    document.querySelectorAll('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
        button.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  };

  const setupTapSimulation = () => {
    const trigger = document.querySelector('[data-tap-sim]');
    const stage = trigger?.closest('.tap-stage');
    if (!trigger || !stage) return;
    let timer = 0;

    trigger.addEventListener('click', () => {
      window.clearTimeout(timer);
      stage.classList.remove('is-tapped');
      void stage.offsetWidth;
      stage.classList.add('is-tapped');
      trigger.setAttribute('aria-label', 'NFC 已触发，学习页面已唤醒');
      timer = window.setTimeout(() => {
        stage.classList.remove('is-tapped');
        trigger.setAttribute('aria-label', '模拟 NFC 触碰');
      }, 4200);
    });
  };

  const setupPathComparison = () => {
    const journey = document.getElementById('journey');
    const controls = [...document.querySelectorAll('[data-path-mode]')];
    if (!journey || controls.length === 0) return;

    const descriptions = {
      before: [
        '解锁手机，并确认网络连接。',
        '在桌面、文件夹或搜索中寻找入口。',
        '打开应用，再进入对应功能。',
        '继续找到适合计划、作业或问答的工具。'
      ],
      after: [
        '触碰桌面右上角的 NFC 圆标。',
        '系统读取标准 NDEF 网页地址。',
        '无需额外安装，直接进入 H5。',
        '计划、作业或问答，各自有清楚入口。'
      ]
    };

    controls.forEach((control) => {
      control.addEventListener('click', () => {
        const mode = control.dataset.pathMode;
        journey.dataset.mode = mode;
        controls.forEach((item) => {
          const selected = item === control;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
        journey.querySelectorAll('article').forEach((step, stepIndex) => {
          const title = step.querySelector('h3');
          const body = step.querySelector('p');
          title.animate?.([
            { opacity: 0, transform: 'translateY(7px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
          title.textContent = step.dataset[mode];
          body.textContent = descriptions[mode][stepIndex];
        });
      });
    });
  };

  const setupSceneTabs = () => {
    const tabs = [...document.querySelectorAll('[data-scene]')];
    const screens = [...document.querySelectorAll('[data-screen]')];
    const name = document.getElementById('sceneName');
    const description = document.getElementById('sceneDescription');
    const index = document.getElementById('sceneIndex');
    const features = document.getElementById('sceneFeatures');
    if (!tabs.length || !screens.length || !name || !description || !index || !features) return;

    const scenes = {
      plan: {
        index: '01 / 03',
        name: '学习计划',
        description: '说清专业、课程目标或考试日期，生成一周安排与每日任务；需要时还能导出日历。',
        features: ['按目标拆成每天可执行的任务', '给出时间与优先级', '支持加入系统日历']
      },
      homework: {
        index: '02 / 03',
        name: '作业管家',
        description: '录入题目或任务要求，先梳理思路与步骤，再把复杂作业拆成今天能开始的一小步。',
        features: ['识别任务要求', '分步骤梳理解法', '保留继续追问的上下文']
      },
      ask: {
        index: '03 / 03',
        name: '随问随答',
        description: '从概念解释到复习追问，用连续对话把“没听懂”推进到“我能复述”。',
        features: ['支持连续追问', '把答案改写得更易懂', '可选择附带学习背景']
      }
    };

    const selectScene = (key, focus = false) => {
      const scene = scenes[key];
      if (!scene) return;
      tabs.forEach((tab) => {
        const selected = tab.dataset.scene === key;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focus) tab.focus();
      });
      screens.forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === key));
      index.textContent = scene.index;
      name.textContent = scene.name;
      description.textContent = scene.description;
      features.replaceChildren(...scene.features.map((feature) => {
        const item = document.createElement('li');
        item.textContent = feature;
        return item;
      }));
    };

    tabs.forEach((tab, tabIndex) => {
      tab.addEventListener('click', () => selectScene(tab.dataset.scene));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = tabIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else nextIndex = (tabIndex + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
        selectScene(tabs[nextIndex].dataset.scene, true);
      });
    });
  };

  const setupMenu = () => {
    const trigger = document.querySelector('.menu-toggle');
    const menu = document.getElementById('mobileMenu');
    if (!trigger || !menu) return;

    const close = () => {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-label', '打开导航');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('menu-open');
    };

    const open = () => {
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-label', '关闭导航');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('menu-open');
    };

    trigger.addEventListener('click', () => trigger.getAttribute('aria-expanded') === 'true' ? close() : open());
    menu.querySelectorAll('a, button').forEach((item) => item.addEventListener('click', close));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') close();
    });
  };

  const setupDemo = () => {
    const dialog = document.getElementById('demoDialog');
    const frame = document.getElementById('demoFrame');
    const loading = document.getElementById('demoLoading');
    const source = 'https://zengfujei-code.github.io/xingzhipeng/';
    if (!dialog || !frame || !loading) return;

    const open = () => {
      if (typeof dialog.showModal !== 'function') {
        window.open(source, '_blank', 'noopener');
        return;
      }
      if (!frame.src) frame.src = source;
      if (!dialog.open) dialog.showModal();
    };

    const close = () => { if (dialog.open) dialog.close(); };

    document.querySelectorAll('[data-demo-open]').forEach((trigger) => trigger.addEventListener('click', open));
    document.querySelector('[data-demo-close]')?.addEventListener('click', close);
    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) close();
    });
    frame.addEventListener('load', () => {
      frame.classList.add('is-loaded');
      loading.classList.add('is-hidden');
    });
  };

  const setupActiveNavigation = () => {
    if (!('IntersectionObserver' in window)) return;
    const links = [...document.querySelectorAll('.nav-links a')];
    const sectionMap = new Map(links.map((link) => [document.querySelector(link.getAttribute('href')), link]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.removeAttribute('aria-current'));
        sectionMap.get(entry.target)?.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-32% 0px -58% 0px', threshold: 0 });
    sectionMap.forEach((_, section) => { if (section) observer.observe(section); });
  };

  splitHeadline();
  document.body.classList.add('is-ready');
  setupReveal();
  setupConstellation();
  setupProductTilt();
  setupMagneticButtons();
  setupTapSimulation();
  setupPathComparison();
  setupSceneTabs();
  setupMenu();
  setupDemo();
  setupActiveNavigation();
})();
