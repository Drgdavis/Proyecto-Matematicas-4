import type { EvaStep } from './eva01Project';
type Application={object:string;purpose:string;observe:string};
const applications:Record<string,Application>={
 axes:{object:'Red topográfica de la base',purpose:'Ubicar instalaciones y mediciones en metros.',observe:'Los ejes y el datum permiten interpretar la posición de cada objeto.'},
 terrain:{object:'Suelo de Marte y levantamiento topográfico',purpose:'Describir la cota sobre la que se apoyan las instalaciones.',observe:'La línea seleccionada reúne puntos del suelo con la misma altura.'},
 domain:{object:'Sector inspeccionado',purpose:'Delimitar el terreno utilizado en los cálculos.',observe:'El anillo marca 110 m; el paisaje exterior aporta contexto visual.'},
 contours:{object:'Mapa de cotas del terreno',purpose:'Reconocer laderas y zonas bajas antes de construir.',observe:'Las líneas siguen el suelo; una separación menor indica una pendiente mayor.'},
 traces:{object:'Perfil topográfico de dos transectos',purpose:'Examinar cómo cambia el suelo al atravesar el cráter.',observe:'El punto de medida recorre un perfil real de la superficie.'},
 evaluations:{object:'Hitos de replanteo A, P y B',purpose:'Comprobar la elevación en ubicaciones concretas.',observe:'Cada marcador se apoya en la altura calculada, medida desde el datum.'},
 terrainInterpretation:{object:'Mapa de aptitud del terreno',purpose:'Relacionar la forma del relieve con decisiones de construcción y drenaje.',observe:'Las zonas se iluminan sobre el suelo: elevación central, depresión occidental y plataforma seleccionada.'},
 gradientP:{object:'Estación topográfica P',purpose:'Medir la pendiente y elegir la dirección de avance.',observe:'La curva cian mantiene la cota; las flechas verde, ámbar y blanca indican ascenso, descenso y nivel en P.'},
 gradientQ:{object:'Estación topográfica Q',purpose:'Comparar las condiciones de otra zona de la base.',observe:'La curva cian y las tres flechas repiten la medición en Q, donde la magnitud de la pendiente cambia.'},
 directional:{object:'Medición de pendiente en P',purpose:'Saber cuánto se sube o baja al avanzar en un rumbo.',observe:'El rumbo fijo ⟨3/5,4/5⟩ produce descenso en P. La proyección ámbar es la derivada local; la sonda recorre el perfil real cian.'},
 directionalQ:{object:'Medición de pendiente en Q',purpose:'Evaluar un segundo rumbo y ubicación.',observe:'La proyección ámbar mide la pendiente local en Q; el punto sobre el perfil cian permite compararla con el cambio real de altura del recorrido.'},
 directionalRose:{object:'Rosa de pendientes de la estación P',purpose:'Comparar todos los rumbos posibles en una sola lectura.',observe:'Cada radio expresa la derivada direccional; los extremos coinciden con ±∇f.'},
 tangent:{object:'Replanteo de una plataforma en P',purpose:'Aproximar el terreno cerca del punto de apoyo.',observe:'La plantilla ámbar toca la superficie en P; las líneas cian conservan el perfil real y muestran la separación en el borde.'},
 normal:{object:'Orientación de un sensor sobre el terreno',purpose:'Definir la perpendicular al plano de apoyo.',observe:'La flecha cian es normal al plano; la blanca marca la vertical de referencia.'},
 linear:{object:'Comprobación de nivelación entre P y H',purpose:'Cuantificar el error al usar un plano en lugar del terreno real.',observe:'Compara f y L en H. El recuadro y la regla 3D rotulada amplían solo el error vertical ×80; plano y relieve conservan sus cotas.'},
 criticals:{object:'Relieve y emplazamientos candidatos',purpose:'Localizar cimas, depresiones y puntos de silla.',observe:'Los cortes cruzados muestran cómo cambia la altura alrededor de cada punto.'},
 criticalMin:{object:'Depresión occidental',purpose:'Distinguir la cota mínima del emplazamiento restringido.',observe:'En el mínimo el suelo sube alrededor; ese punto no está sobre el corredor r=72 m.'},
 criticalOther:{object:'Montículo central y collado oriental',purpose:'Evitar confundir un máximo con una silla.',observe:'La cima baja en ambas direcciones; en la silla un corte sube y otro baja.'},
 safe:{object:'Plataforma B⁺ y frontera de comparación',purpose:'Buscar la menor pendiente entre puntos de llegada a 72 m del centro matemático.',observe:'El anillo es una restricción de diseño; comparte radio con la ruta de reconocimiento y el arco exterior de R, sin representar una carretera circular completa.'},
 candidates:{object:'Plataforma B⁺ y frontera de comparación',purpose:'Comparar las soluciones de Lagrange.',observe:'La lectura varía al recorrer el anillo. B⁺ es el candidato de menor pendiente y el acceso materializado hacia el hábitat.'},
 base:{object:'Acceso a las instalaciones',purpose:'Justificar la elección de ubicación con una magnitud medible.',observe:'La diferencia entre B y −B cuantifica la reducción de pendiente.'},
 route:{object:'Rover de reconocimiento',purpose:'Describir una ruta que conserva contacto con el suelo.',observe:'Mueve el rover: su altura proviene de f y su inclinación sigue el terreno.'},
 vectors:{object:'Dirección y cambio de trayectoria del rover',purpose:'Relacionar las derivadas de la ruta con el movimiento.',observe:'La flecha cian es r′ y la roja r″, reescaladas. El parámetro se mide en radianes.'},
 tangentVector:{object:'Orientación instantánea del rover',purpose:'Indicar hacia dónde avanza a lo largo de la ruta.',observe:'La tangente cambia de dirección mientras el vehículo recorre la curva.'},
 curvature:{object:'Giro de la ruta del rover',purpose:'Medir cuánto se curva el recorrido en cada punto.',observe:'El círculo osculador toca la ruta y su radio es 1/κ.'},
 safeSpeed:{object:'Control de marcha del rover',purpose:'Convertir la curvatura de la ruta en una velocidad límite.',observe:'La barra de velocidad responde a κ y a la aceleración lateral adoptada.'},
 routeMarkers:{object:'Hitos de la misión del rover',purpose:'Identificar inicio, control y final del recorrido.',observe:'Los tres hitos ocupan posiciones concretas de la curva tridimensional.'},
 solarRegion:{object:'Sector matemático R y suelo del campo solar',purpose:'Medir el área proyectada y real disponible para implantar las instalaciones.',observe:'El tinte translúcido identifica R como región matemática; no es una losa construida. Los paneles ocupan solo una parte del terreno.'},
 polarGrid:{object:'Parcelación del campo solar',purpose:'Medir celdas entre radios y ángulos.',observe:'Las celdas se ensanchan con r: por eso el área incluye el factor r.'},
 surfaceArea:{object:'Recubrimiento del terreno solar',purpose:'Comparar el suelo inclinado con su proyección horizontal.',observe:'La superficie cian y la proyección ámbar tienen áreas distintas.'},
 solarPower:{object:'Campo de estudio de 20 paneles en R',purpose:'Calcular la potencia instantánea de los veinte paneles de la región R.',observe:'Mueve la hora solar: la flecha de luz, las sombras y la potencia de R cambian con el producto punto. Los otros 24 paneles se evalúan aparte en el balance de servicios.'},
 doubleVolume:{object:'Columna de terreno sobre el datum',purpose:'Medir el volumen geométrico entre z=0 y el relieve.',observe:'Las columnas acumulan alturas. No representan una excavación propuesta.'},
 tank:{object:'Depósito semielipsoidal',purpose:'Dimensionar la reserva a partir de la forma interior.',observe:'Se ubica el depósito en el campus y luego un corte horizontal muestra cómo cambia la sección; todavía no se suma volumen.'},
 density:{object:'Contenido del depósito',purpose:'Calcular la masa de una mezcla cuya densidad varía.',observe:'Los puntos representan muestras de densidad; su color cambia con la posición.'},
 mass:{object:'Distribución del contenido y apoyo del depósito',purpose:'Situar el centro de masa mediante momentos.',observe:'El punto rojo es el centro calculado y la línea muestra su proyección sobre el apoyo.'},
 jacobian:{object:'Capas internas del depósito',purpose:'Traducir coordenadas normalizadas a volúmenes físicos.',observe:'La semiesfera se escala a los semiejes 18, 14 y 8 m; el jacobiano corrige ese cambio.'},
 runoff:{object:'Canales topográficos del dominio D',purpose:'Seguir líneas de máximo descenso calculadas con −∇f.',observe:'Cada trayectoria comienza en una semilla y pierde altura paso a paso; no representa un caudal.'},
 all:{object:'Conjunto de la base EVA03',purpose:'Comprobar que terreno, acceso, ruta y depósito comparten un sistema.',observe:'Relaciona los hitos y regiones con las instalaciones que ves.'}
 ,architecture:{object:'Sistemas de EVA03',purpose:'Cada sector tiene una función y una posición.',observe:'El núcleo, los servicios, la reserva y el campo solar permanecen en sus posiciones finales sobre el mismo terreno.'}
};
export function applicationFor(step:EvaStep):Application{
 if(step.name==='Segundas derivadas')return{object:'Cambio de pendiente en el transecto P',purpose:'Detectar cómo gira la tangente al avanzar.',observe:'La flecha sigue el corte y la lectura de fₓₓ mide el cambio local de pendiente.'};
 if(step.name==='Valor medio')return{object:'Cota media del campo solar',purpose:'Sustituir alturas variables por una altura uniforme de igual volumen.',observe:'El plano ámbar indica la media; la barra compara esa cota con el suelo seleccionado.'};
 if(step.name==='Volumen paso a paso')return{object:'Interior del depósito E',purpose:'Explicar por qué la integral triple da la capacidad geométrica.',observe:'Una cuña del depósito crece en el mismo orden de la integral: primero ρ desde el centro, luego φ hacia la base y al final θ hasta completar la vuelta.'};
 if(step.name==='Transformación y límites')return{object:'Semiesfera y depósito',purpose:'¿Cómo llega la semiesfera al depósito?',observe:'La forma cian alcanza los factores 18, 14 y 8; la referencia violeta usa ampliación solo visual.'};
 if(step.name==='Cartesiano vs. elipsoidal')return{object:'El mismo sólido en dos sistemas',purpose:'Comparar cortes equivalentes y los límites de cada formulación.',observe:'El corte elíptico cartesiano corresponde al círculo de la semiesfera en el mismo nivel.'};
 return applications[step.target]||applications.all;
}
