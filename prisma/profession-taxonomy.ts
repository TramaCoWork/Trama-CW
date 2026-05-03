/**
 * Taxonomia de profesiones para Trama CoWork
 * Estructura: { slug, name, children: [{ slug, name, children: [...] }] }
 */
export const professionTaxonomy = [
  {
    slug: 'servicios-profesionales',
    name: 'Servicios Profesionales',
    children: [
      {
        slug: 'legales',
        name: 'Legales',
        children: [
          { slug: 'abogado-corporativo', name: 'Abogado corporativo' },
          { slug: 'abogado-laboral', name: 'Abogado laboral' },
          { slug: 'abogado-tributario', name: 'Abogado tributario' },
          { slug: 'abogado-startups', name: 'Abogado de startups / contratos digitales' },
          { slug: 'propiedad-intelectual', name: 'Especialista en propiedad intelectual' },
          { slug: 'compliance-legal', name: 'Compliance & legal advisor' },
        ],
      },
      {
        slug: 'contables-financieros',
        name: 'Contables & Financieros',
        children: [
          { slug: 'contador-publico', name: 'Contador público' },
          { slug: 'asesor-impositivo', name: 'Asesor impositivo' },
          { slug: 'planificacion-fiscal', name: 'Especialista en planificación fiscal' },
          { slug: 'auditor', name: 'Auditor' },
          { slug: 'controller-financiero', name: 'Controller financiero externo' },
          { slug: 'cfo-fractional', name: 'CFO fractional' },
        ],
      },
      {
        slug: 'consultoria-negocio',
        name: 'Consultoría de Negocio',
        children: [
          { slug: 'consultor-estrategia', name: 'Consultor en estrategia empresarial' },
          { slug: 'consultor-transformacion-digital', name: 'Consultor en transformación digital' },
          { slug: 'consultor-procesos', name: 'Consultor en procesos / mejora continua' },
          { slug: 'consultor-modelos-negocio', name: 'Consultor en modelos de negocio' },
          { slug: 'consultor-escalabilidad', name: 'Consultor en escalabilidad / franquicias' },
          { slug: 'consultor-cx', name: 'Consultor en experiencia de cliente (CX)' },
        ],
      },
      {
        slug: 'recursos-humanos',
        name: 'Recursos Humanos',
        children: [
          { slug: 'consultor-rrhh', name: 'Consultor en RRHH' },
          { slug: 'recruiter', name: 'Recruiter / Talent Acquisition' },
          { slug: 'cultura-organizacional', name: 'Especialista en cultura organizacional' },
          { slug: 'hr-business-partner', name: 'HR Business Partner externo' },
          { slug: 'capacitacion-desarrollo', name: 'Especialista en capacitación y desarrollo' },
          { slug: 'compensaciones-beneficios', name: 'Compensaciones & beneficios' },
        ],
      },
      {
        slug: 'coaching-desarrollo',
        name: 'Coaching & Desarrollo',
        children: [
          { slug: 'coach-ejecutivo', name: 'Coach ejecutivo' },
          { slug: 'coach-ontologico', name: 'Coach ontológico' },
          { slug: 'coach-carrera', name: 'Coach de carrera' },
          { slug: 'coach-equipos', name: 'Coach de equipos' },
          { slug: 'mentor-emprendedores', name: 'Mentor de emprendedores' },
          { slug: 'facilitador-workshops', name: 'Facilitador de workshops' },
        ],
      },
      {
        slug: 'psicologia-laboral',
        name: 'Psicología laboral',
        children: [
          { slug: 'psicologo-organizacional', name: 'Psicólogo organizacional' },
          { slug: 'psicologo-vocacional', name: 'Psicólogo vocacional' },
        ],
      },
      {
        slug: 'especialistas-complementarios',
        name: 'Especialistas complementarios',
        children: [
          { slug: 'asesor-marca-personal', name: 'Asesor en marca personal' },
          { slug: 'ventas-consultivas', name: 'Especialista en ventas consultivas' },
          { slug: 'negociacion', name: 'Especialista en negociación' },
          { slug: 'consultor-pricing', name: 'Consultor en pricing' },
          { slug: 'experiencia-servicio', name: 'Especialista en experiencia de servicio' },
        ],
      },
    ],
  },
  {
    slug: 'creativos',
    name: 'Profesionales Creativos',
    children: [
      {
        slug: 'diseno-visual',
        name: 'Diseño Visual',
        children: [
          { slug: 'disenador-grafico', name: 'Diseñador gráfico' },
          { slug: 'disenador-ux-ui', name: 'Diseñador UX/UI' },
          { slug: 'disenador-producto-digital', name: 'Diseñador de producto digital' },
          { slug: 'ilustrador', name: 'Ilustrador' },
          { slug: 'motion-designer', name: 'Motion designer' },
        ],
      },
      {
        slug: 'audiovisual',
        name: 'Audiovisual',
        children: [
          { slug: 'fotografo', name: 'Fotógrafo' },
          { slug: 'videografo', name: 'Videógrafo' },
          { slug: 'editor-video', name: 'Editor de video' },
        ],
      },
      {
        slug: 'contenido-digital',
        name: 'Contenido Digital',
        children: [
          { slug: 'community-manager', name: 'Community Manager' },
          { slug: 'social-media-strategist', name: 'Social Media Strategist' },
          { slug: 'paid-media-specialist', name: 'Paid Media Specialist' },
          { slug: 'copywriter', name: 'Copywriter / Redactor' },
          { slug: 'content-creator', name: 'Content Creator' },
          { slug: 'seo-specialist', name: 'SEO Specialist' },
          { slug: 'email-marketing', name: 'Email Marketing Specialist' },
        ],
      },
    ],
  },
  {
    slug: 'tech',
    name: 'Perfiles Tech',
    children: [
      {
        slug: 'desarrollo-software',
        name: 'Desarrollo de Software',
        children: [
          { slug: 'frontend-developer', name: 'Frontend Developer' },
          { slug: 'backend-developer', name: 'Backend Developer' },
          { slug: 'fullstack-developer', name: 'Full Stack Developer' },
          { slug: 'mobile-developer', name: 'Mobile Developer' },
          { slug: 'game-developer', name: 'Game Developer' },
        ],
      },
      {
        slug: 'data-ia',
        name: 'Data & Inteligencia Artificial',
        children: [
          { slug: 'data-analyst', name: 'Data Analyst' },
          { slug: 'data-scientist', name: 'Data Scientist' },
          { slug: 'data-engineer', name: 'Data Engineer' },
          { slug: 'ml-engineer', name: 'Machine Learning Engineer' },
          { slug: 'ai-specialist', name: 'AI Specialist' },
          { slug: 'prompt-engineer', name: 'Prompt Engineer' },
        ],
      },
      {
        slug: 'producto-agilidad',
        name: 'Producto y Agilidad',
        children: [
          { slug: 'product-manager', name: 'Product Manager' },
          { slug: 'product-owner', name: 'Product Owner' },
          { slug: 'agile-coach', name: 'Agile Coach' },
          { slug: 'scrum-master', name: 'Scrum Master' },
          { slug: 'business-analyst', name: 'Business Analyst / Analista Funcional' },
        ],
      },
      {
        slug: 'diseno-digital',
        name: 'Diseño Digital',
        children: [
          { slug: 'ux-designer', name: 'UX Designer' },
          { slug: 'ui-designer', name: 'UI Designer' },
          { slug: 'ux-researcher', name: 'UX Researcher' },
          { slug: 'product-designer', name: 'Product Designer' },
          { slug: 'disenador-web', name: 'Diseñador Web' },
        ],
      },
      {
        slug: 'infraestructura-sistemas',
        name: 'Infraestructura & Sistemas',
        children: [
          { slug: 'devops-engineer', name: 'DevOps Engineer' },
          { slug: 'cloud-engineer', name: 'Cloud Engineer' },
          { slug: 'sre', name: 'Site Reliability Engineer (SRE)' },
          { slug: 'sysadmin', name: 'SysAdmin' },
          { slug: 'networking-specialist', name: 'Networking Specialist' },
        ],
      },
      {
        slug: 'seguridad',
        name: 'Seguridad',
        children: [
          { slug: 'cybersecurity-specialist', name: 'Cybersecurity Specialist' },
          { slug: 'ethical-hacker', name: 'Ethical Hacker' },
          { slug: 'analista-seguridad', name: 'Analista de Seguridad Informática' },
          { slug: 'compliance-seguridad', name: 'Compliance & Seguridad de la Información' },
        ],
      },
      {
        slug: 'calidad',
        name: 'Calidad',
        children: [
          { slug: 'qa-manual', name: 'QA Manual' },
          { slug: 'qa-automation', name: 'QA Automation' },
          { slug: 'test-engineer', name: 'Test Engineer' },
        ],
      },
      {
        slug: 'tech-negocios',
        name: 'Tecnología aplicada a negocios',
        children: [
          { slug: 'crm-specialist', name: 'CRM Specialist' },
          { slug: 'erp-specialist', name: 'ERP Specialist' },
          { slug: 'automation-specialist', name: 'Automation Specialist' },
          { slug: 'martech-specialist', name: 'Martech Specialist' },
        ],
      },
      {
        slug: 'nuevas-tecnologias',
        name: 'Nuevas tecnologías / nichos',
        children: [
          { slug: 'blockchain-developer', name: 'Blockchain Developer' },
          { slug: 'web3-specialist', name: 'Web3 Specialist' },
          { slug: 'ar-vr-developer', name: 'AR/VR Developer' },
          { slug: 'iot-specialist', name: 'IoT Specialist' },
        ],
      },
    ],
  },
  {
    slug: 'marketing-ventas',
    name: 'Marketing y Ventas',
    children: [
      {
        slug: 'marketing-estrategico',
        name: 'Marketing estratégico y digital',
        children: [
          { slug: 'marketing-digital', name: 'Especialista en marketing digital' },
          { slug: 'growth-marketer', name: 'Growth Marketer' },
          { slug: 'performance-marketing', name: 'Performance Marketing Specialist' },
          { slug: 'trafficker', name: 'Trafficker / Paid Media Specialist' },
          { slug: 'marketing-automation', name: 'Marketing Automation Specialist' },
          { slug: 'seo-specialist-mkt', name: 'SEO Specialist' },
          { slug: 'content-strategist', name: 'Content Strategist' },
          { slug: 'brand-strategist', name: 'Brand Strategist' },
        ],
      },
      {
        slug: 'datos-optimizacion',
        name: 'Datos y optimización',
        children: [
          { slug: 'marketing-analyst', name: 'Marketing Analyst' },
          { slug: 'cro-specialist', name: 'CRO Specialist' },
          { slug: 'customer-journey', name: 'Customer Journey Specialist' },
          { slug: 'analitica-digital', name: 'Especialista en analítica digital' },
        ],
      },
      {
        slug: 'ventas-comercial',
        name: 'Ventas y desarrollo comercial',
        children: [
          { slug: 'ejecutivo-comercial', name: 'Ejecutivo comercial freelance' },
          { slug: 'sdr', name: 'SDR (Sales Development Representative)' },
          { slug: 'account-executive', name: 'Account Executive' },
          { slug: 'business-developer', name: 'Business Developer' },
          { slug: 'sales-manager', name: 'Sales Manager externo / fractional' },
          { slug: 'ventas-consultivas-mkt', name: 'Especialista en ventas consultivas' },
          { slug: 'closer', name: 'Closer' },
        ],
      },
      {
        slug: 'expansion-alianzas',
        name: 'Expansión y alianzas',
        children: [
          { slug: 'partnership-manager', name: 'Partnership Manager' },
          { slug: 'afiliados', name: 'Especialista en afiliados' },
          { slug: 'canales-venta', name: 'Desarrollo de canales de venta' },
          { slug: 'expansion-comercial', name: 'Consultor en expansión comercial' },
        ],
      },
    ],
  },
  {
    slug: 'bienestar-salud',
    name: 'Bienestar y Salud',
    children: [
      {
        slug: 'bienestar-fisico',
        name: 'Bienestar físico y cuerpo',
        children: [
          { slug: 'instructor-yoga', name: 'Instructor de yoga' },
          { slug: 'profesor-pilates', name: 'Profesor de pilates' },
          { slug: 'entrenador-funcional', name: 'Entrenador funcional' },
          { slug: 'stretching-movilidad', name: 'Profesional de stretching / movilidad' },
          { slug: 'breathwork', name: 'Técnicas de respiración (breathwork)' },
        ],
      },
      {
        slug: 'salud-mental',
        name: 'Salud mental y emocional',
        children: [
          { slug: 'psicologo', name: 'Psicólogo' },
          { slug: 'terapeuta-emocional', name: 'Terapeuta en gestión emocional' },
          { slug: 'facilitador-mindfulness', name: 'Facilitador de mindfulness' },
          { slug: 'instructor-meditacion', name: 'Instructor de meditación' },
          { slug: 'coach-bienestar', name: 'Coach de bienestar' },
        ],
      },
      {
        slug: 'terapias-holisticas',
        name: 'Terapias holísticas',
        children: [
          { slug: 'terapeuta-holistico', name: 'Terapeuta holístico' },
          { slug: 'biodecodificacion', name: 'Especialista en biodecodificación' },
          { slug: 'terapeuta-energetico', name: 'Terapeuta energético (reiki, etc.)' },
          { slug: 'practicas-integrativas', name: 'Facilitador de prácticas integrativas' },
        ],
      },
      {
        slug: 'nutricion-habitos',
        name: 'Nutrición y hábitos',
        children: [
          { slug: 'nutricionista', name: 'Nutricionista' },
          { slug: 'coach-habitos', name: 'Coach en hábitos saludables' },
          { slug: 'alimentacion-consciente', name: 'Especialista en alimentación consciente' },
          { slug: 'bienestar-integral', name: 'Asesor en bienestar integral' },
        ],
      },
    ],
  },
  {
    slug: 'profesores',
    name: 'Profesores',
    children: [
      {
        slug: 'academicos',
        name: 'Académicos',
        children: [
          { slug: 'profesor-idiomas', name: 'Idiomas' },
          { slug: 'profesor-matematica', name: 'Matemática' },
          { slug: 'profesor-lengua', name: 'Lengua y Literatura' },
          { slug: 'profesor-cs-sociales', name: 'Ciencias Sociales' },
          { slug: 'profesor-cs-naturales', name: 'Ciencias Naturales' },
          { slug: 'profesor-fisica', name: 'Física' },
          { slug: 'profesor-quimica', name: 'Química' },
          { slug: 'profesor-biologia', name: 'Biología' },
          { slug: 'profesor-historia', name: 'Historia' },
          { slug: 'profesor-geografia', name: 'Geografía' },
        ],
      },
      {
        slug: 'habilidades-profesionales',
        name: 'Habilidades Profesionales / Técnicas',
        children: [
          { slug: 'profesor-programacion', name: 'Programación' },
          { slug: 'profesor-datos', name: 'Análisis de Datos' },
          { slug: 'profesor-ia', name: 'Inteligencia Artificial aplicada' },
          { slug: 'profesor-marketing', name: 'Marketing Digital' },
          { slug: 'profesor-finanzas', name: 'Finanzas personales / empresariales' },
          { slug: 'profesor-ventas', name: 'Ventas' },
          { slug: 'profesor-gestion-proyectos', name: 'Gestión de Proyectos' },
          { slug: 'profesor-ux-ui', name: 'UX/UI Design' },
          { slug: 'profesor-diseno-grafico', name: 'Diseño Gráfico' },
          { slug: 'profesor-herramientas', name: 'Herramientas digitales' },
        ],
      },
      {
        slug: 'creativos-profesores',
        name: 'Profesores Creativos',
        children: [
          { slug: 'profesor-escritura', name: 'Escritura creativa' },
          { slug: 'profesor-fotografia', name: 'Fotografía' },
          { slug: 'profesor-edicion-video', name: 'Edición de video' },
          { slug: 'profesor-contenido', name: 'Diseño de contenido' },
          { slug: 'profesor-musica', name: 'Música' },
          { slug: 'profesor-arte', name: 'Arte / pintura / ilustración' },
          { slug: 'profesor-teatro', name: 'Teatro / expresión corporal' },
        ],
      },
      {
        slug: 'desarrollo-personal-profesores',
        name: 'Desarrollo Personal y Profesional',
        children: [
          { slug: 'profesor-liderazgo', name: 'Liderazgo' },
          { slug: 'profesor-comunicacion', name: 'Comunicación efectiva' },
          { slug: 'profesor-oratoria', name: 'Oratoria' },
          { slug: 'profesor-marca-personal', name: 'Marca personal' },
          { slug: 'profesor-productividad', name: 'Productividad' },
          { slug: 'profesor-gestion-tiempo', name: 'Gestión del tiempo' },
          { slug: 'profesor-negociacion', name: 'Negociación' },
        ],
      },
      {
        slug: 'bienestar-profesores',
        name: 'Profesores de Bienestar',
        children: [
          { slug: 'profesor-yoga', name: 'Yoga' },
          { slug: 'profesor-meditacion', name: 'Meditación' },
          { slug: 'profesor-mindfulness', name: 'Mindfulness' },
          { slug: 'profesor-respiracion', name: 'Respiración consciente' },
          { slug: 'profesor-coaching', name: 'Coaching' },
          { slug: 'profesor-desarrollo-personal', name: 'Desarrollo personal' },
          { slug: 'profesor-gestion-emocional', name: 'Gestión emocional' },
        ],
      },
    ],
  },
  {
    slug: 'otros',
    name: 'Otros',
    children: [
      {
        slug: 'otros-profesiones',
        name: 'Otras profesiones',
        children: [
          { slug: 'arquitecto', name: 'Arquitecto' },
          { slug: 'disenador-interiores', name: 'Diseñador de interiores' },
          { slug: 'ingeniero', name: 'Ingeniero' },
          { slug: 'project-manager-freelance', name: 'Project Manager freelance' },
        ],
      },
    ],
  },
];
