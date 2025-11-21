import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, LogOut, TrendingUp } from 'lucide-react';

// Simular window.storage con localStorage
const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? { key, value, shared: false } : null;
    } catch (error) {
      throw new Error('Key not found');
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    } catch (error) {
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    } catch (error) {
      return null;
    }
  }
};

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState('pronosticos');
  const [selectedJornada, setSelectedJornada] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [loading, setLoading] = useState(true);

  const grupos = {
    A: ['Qatar', 'Ecuador', 'Senegal', 'Países Bajos'],
    B: ['Inglaterra', 'Irán', 'Estados Unidos', 'Gales'],
    C: ['Argentina', 'Arabia Saudita', 'México', 'Polonia'],
    D: ['Francia', 'Australia', 'Dinamarca', 'Túnez'],
    E: ['España', 'Costa Rica', 'Alemania', 'Japón'],
    F: ['Bélgica', 'Canadá', 'Marruecos', 'Croacia'],
    G: ['Brasil', 'Serbia', 'Suiza', 'Camerún'],
    H: ['Portugal', 'Ghana', 'Uruguay', 'Corea del Sur']
  };

  const generarPartidos = () => {
    const partidos = {};
    Object.keys(grupos).forEach(grupo => {
      const equipos = grupos[grupo];
      partidos[grupo] = {
        1: [
          { id: `${grupo}-J1-1`, local: equipos[0], visitante: equipos[1], resultado: null },
          { id: `${grupo}-J1-2`, local: equipos[2], visitante: equipos[3], resultado: null }
        ],
        2: [
          { id: `${grupo}-J2-1`, local: equipos[0], visitante: equipos[2], resultado: null },
          { id: `${grupo}-J2-2`, local: equipos[1], visitante: equipos[3], resultado: null }
        ],
        3: [
          { id: `${grupo}-J3-1`, local: equipos[1], visitante: equipos[2], resultado: null },
          { id: `${grupo}-J3-2`, local: equipos[0], visitante: equipos[3], resultado: null }
        ]
      };
    });
    return partidos;
  };

  const [partidos, setPartidos] = useState(() => generarPartidos());
  const [pronosticos, setPronosticos] = useState({});

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [partidosRes, pronosticosRes] = await Promise.all([
        storage.get('partidos').catch(() => null),
        storage.get('pronosticos').catch(() => null)
      ]);

      if (partidosRes?.value) {
        setPartidos(JSON.parse(partidosRes.value));
      }
      if (pronosticosRes?.value) {
        setPronosticos(JSON.parse(pronosticosRes.value));
      }
    } catch (error) {
      console.log('Iniciando con datos por defecto');
    }
    setLoading(false);
  };

  const guardarDatos = async (nuevosPartidos, nuevosPronosticos) => {
    try {
      await Promise.all([
        storage.set('partidos', JSON.stringify(nuevosPartidos)),
        storage.set('pronosticos', JSON.stringify(nuevosPronosticos))
      ]);
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleAuth = async () => {
    if (!username || !password) {
      alert('Por favor ingresa usuario y contraseña');
      return;
    }

    try {
      const userKey = `user_${username}`;
      const usuarioExistente = await storage.get(userKey).catch(() => null);

      if (isRegistering) {
        if (usuarioExistente) {
          alert('El usuario ya existe');
          return;
        }
        await storage.set(userKey, password);
        setCurrentUser(username);
        setPronosticos(prev => ({ ...prev, [username]: {} }));
      } else {
        if (!usuarioExistente || usuarioExistente.value !== password) {
          alert('Usuario o contraseña incorrectos');
          return;
        }
        setCurrentUser(username);
      }
      setUsername('');
      setPassword('');
    } catch (error) {
      alert('Error en autenticación');
    }
  };

  const handlePronostico = (partidoId, golesLocal, golesVisitante) => {
    const nuevosPronosticos = {
      ...pronosticos,
      [currentUser]: {
        ...pronosticos[currentUser],
        [partidoId]: { local: parseInt(golesLocal), visitante: parseInt(golesVisitante) }
      }
    };
    setPronosticos(nuevosPronosticos);
    guardarDatos(partidos, nuevosPronosticos);
  };

  const handleResultado = (grupo, jornada, partidoIdx, golesLocal, golesVisitante) => {
    const nuevosPartidos = { ...partidos };
    nuevosPartidos[grupo][jornada][partidoIdx].resultado = {
      local: parseInt(golesLocal),
      visitante: parseInt(golesVisitante)
    };
    setPartidos(nuevosPartidos);
    guardarDatos(nuevosPartidos, pronosticos);
  };

  const calcularPuntos = (pronostico, resultado) => {
    if (!pronostico || !resultado) return 0;
    
    const resultadoReal = resultado.local > resultado.visitante ? 'L' : 
                          resultado.local < resultado.visitante ? 'V' : 'E';
    const resultadoPronostico = pronostico.local > pronostico.visitante ? 'L' :
                                pronostico.local < pronostico.visitante ? 'V' : 'E';
    
    if (pronostico.local === resultado.local && pronostico.visitante === resultado.visitante) {
      return 5;
    }
    if (resultadoReal === resultadoPronostico) {
      return 3;
    }
    return 0;
  };

  const calcularTablaGlobal = () => {
    const tabla = {};
    Object.keys(pronosticos).forEach(usuario => {
      let puntos = 0;
      Object.keys(pronosticos[usuario]).forEach(partidoId => {
        const [grupo, jornada] = partidoId.split('-');
        const jornadaNum = parseInt(jornada.replace('J', ''));
        const partido = partidos[grupo]?.[jornadaNum]?.find(p => p.id === partidoId);
        if (partido?.resultado) {
          puntos += calcularPuntos(pronosticos[usuario][partidoId], partido.resultado);
        }
      });
      tabla[usuario] = puntos;
    });
    return Object.entries(tabla).sort((a, b) => b[1] - a[1]);
  };

  const calcularTablaPosiciones = (grupo) => {
    const equipos = grupos[grupo];
    const tabla = {};
    
    equipos.forEach(equipo => {
      tabla[equipo] = { pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0 };
    });

    [1, 2, 3].forEach(jornada => {
      partidos[grupo][jornada].forEach(partido => {
        if (partido.resultado) {
          const { local, visitante, resultado } = partido;
          tabla[local].pj++;
          tabla[visitante].pj++;
          tabla[local].gf += resultado.local;
          tabla[local].gc += resultado.visitante;
          tabla[visitante].gf += resultado.visitante;
          tabla[visitante].gc += resultado.local;

          if (resultado.local > resultado.visitante) {
            tabla[local].pts += 3;
            tabla[local].pg++;
            tabla[visitante].pp++;
          } else if (resultado.local < resultado.visitante) {
            tabla[visitante].pts += 3;
            tabla[visitante].pg++;
            tabla[local].pp++;
          } else {
            tabla[local].pts += 1;
            tabla[visitante].pts += 1;
            tabla[local].pe++;
            tabla[visitante].pe++;
          }
        }
      });
    });

    Object.keys(tabla).forEach(equipo => {
      tabla[equipo].dif = tabla[equipo].gf - tabla[equipo].gc;
    });

    return Object.entries(tabla)
      .sort((a, b) => b[1].pts - a[1].pts || b[1].dif - a[1].dif || b[1].gf - a[1].gf)
      .map(([equipo, stats]) => ({ equipo, ...stats }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Trophy className="w-12 h-12 text-yellow-500 mr-2" />
            <h1 className="text-3xl font-bold text-gray-800">Mundial 2026</h1>
          </div>
          <h2 className="text-xl font-semibold text-center mb-6 text-gray-700">
            {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition mb-4"
          >
            {isRegistering ? 'Registrarse' : 'Entrar'}
          </button>
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-blue-600 hover:text-blue-800 transition"
          >
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-yellow-300 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">Pronósticos Mundial 2026</h1>
                <p className="text-blue-100">Usuario: {currentUser}</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="flex items-center bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </button>
          </div>

          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('pronosticos')}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === 'pronosticos'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              Mis Pronósticos
            </button>
            <button
              onClick={() => setActiveTab('resultados')}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === 'resultados'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Trophy className="w-5 h-5 inline mr-2" />
              Resultados
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === 'ranking'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Ranking
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'pronosticos' && (
              <div>
                <div className="mb-6 flex gap-4">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.keys(grupos).map(g => (
                      <option key={g} value={g}>Grupo {g}</option>
                    ))}
                  </select>
                  <select
                    value={selectedJornada}
                    onChange={(e) => setSelectedJornada(parseInt(e.target.value))}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={1}>Jornada 1</option>
                    <option value={2}>Jornada 2</option>
                    <option value={3}>Jornada 3</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {partidos[selectedGroup][selectedJornada].map((partido) => {
                    const miPronostico = pronosticos[currentUser]?.[partido.id];
                    const puntos = partido.resultado ? calcularPuntos(miPronostico, partido.resultado) : null;
                    
                    return (
                      <div key={partido.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 text-right font-semibold text-gray-800">
                            {partido.local}
                          </div>
                          <div className="mx-4 flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={miPronostico?.local ?? ''}
                              onChange={(e) => handlePronostico(partido.id, e.target.value, miPronostico?.visitante ?? 0)}
                              className="w-16 p-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="0"
                            />
                            <span className="font-bold text-gray-600">-</span>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={miPronostico?.visitante ?? ''}
                              onChange={(e) => handlePronostico(partido.id, miPronostico?.local ?? 0, e.target.value)}
                              className="w-16 p-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex-1 font-semibold text-gray-800">
                            {partido.visitante}
                          </div>
                        </div>
                        {partido.resultado && (
                          <div className="text-center text-sm">
                            <span className="text-gray-600">Resultado: </span>
                            <span className="font-bold">{partido.resultado.local} - {partido.resultado.visitante}</span>
                            {puntos !== null && (
                              <span className={`ml-3 px-3 py-1 rounded-full font-bold ${
                                puntos === 5 ? 'bg-green-500 text-white' :
                                puntos === 3 ? 'bg-blue-500 text-white' :
                                'bg-red-500 text-white'
                              }`}>
                                {puntos} pts
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'resultados' && (
              <div>
                <div className="mb-6 flex gap-4">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.keys(grupos).map(g => (
                      <option key={g} value={g}>Grupo {g}</option>
                    ))}
                  </select>
                  <select
                    value={selectedJornada}
                    onChange={(e) => setSelectedJornada(parseInt(e.target.value))}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={1}>Jornada 1</option>
                    <option value={2}>Jornada 2</option>
                    <option value={3}>Jornada 3</option>
                  </select>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Ingresar Resultados Reales</h3>
                  <div className="space-y-4">
                    {partidos[selectedGroup][selectedJornada].map((partido, idx) => (
                      <div key={partido.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-right font-semibold text-gray-800">
                            {partido.local}
                          </div>
                          <div className="mx-4 flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={partido.resultado?.local ?? ''}
                              onChange={(e) => handleResultado(selectedGroup, selectedJornada, idx, e.target.value, partido.resultado?.visitante ?? 0)}
                              className="w-16 p-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-green-500 outline-none"
                              placeholder="0"
                            />
                            <span className="font-bold text-gray-600">-</span>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={partido.resultado?.visitante ?? ''}
                              onChange={(e) => handleResultado(selectedGroup, selectedJornada, idx, partido.resultado?.local ?? 0, e.target.value)}
                              className="w-16 p-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-green-500 outline-none"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex-1 font-semibold text-gray-800">
                            {partido.visitante}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Tabla de Posiciones - Grupo {selectedGroup}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="p-3 text-left">Pos</th>
                          <th className="p-3 text-left">Equipo</th>
                          <th className="p-3 text-center">PJ</th>
                          <th className="p-3 text-center">PG</th>
                          <th className="p-3 text-center">PE</th>
                          <th className="p-3 text-center">PP</th>
                          <th className="p-3 text-center">GF</th>
                          <th className="p-3 text-center">GC</th>
                          <th className="p-3 text-center">Dif</th>
                          <th className="p-3 text-center">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calcularTablaPosiciones(selectedGroup).map((equipo, idx) => (
                          <tr key={equipo.equipo} className={`border-b ${idx < 2 ? 'bg-green-50' : ''}`}>
                            <td className="p-3 font-bold">{idx + 1}</td>
                            <td className="p-3 font-semibold">{equipo.equipo}</td>
                            <td className="p-3 text-center">{equipo.pj}</td>
                            <td className="p-3 text-center">{equipo.pg}</td>
                            <td className="p-3 text-center">{equipo.pe}</td>
                            <td className="p-3 text-center">{equipo.pp}</td>
                            <td className="p-3 text-center">{equipo.gf}</td>
                            <td className="p-3 text-center">{equipo.gc}</td>
                            <td className="p-3 text-center font-semibold">{equipo.dif}</td>
                            <td className="p-3 text-center font-bold text-blue-600">{equipo.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ranking' && (
              <div>
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Ranking de Jugadores</h3>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6">
                  {calcularTablaGlobal().map(([usuario, puntos], idx) => (
                    <div
                      key={usuario}
                      className={`flex items-center justify-between p-4 mb-3 rounded-lg ${
                        idx === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg' :
                        idx === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                        idx === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' :
                        'bg-white'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl font-bold mr-4 w-8">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                        </span>
                        <span className={`text-lg font-semibold ${usuario === currentUser ? 'underline' : ''}`}>
                          {usuario} {usuario === currentUser ? '(Tú)' : ''}
                        </span>
                      </div>
                      <span className="text-2xl font-bold">{puntos} pts</span>
                    </div>
                  ))}
                  {calcularTablaGlobal().length === 0 && (
                    <p className="text-center text-gray-600">No hay pronósticos registrados aún</p>
                  )}
                </div>
                
                <div className="mt-8 bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-lg mb-3 text-blue-900">Sistema de Puntuación</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold mr-3">5 pts</span>
                      Resultado exacto
                    </li>
                    <li className="flex items-center">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-bold mr-3">3 pts</span>
                      Acertar ganador o empate
                    </li>
                    <li className="flex items-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full font-bold mr-3">0 pts</span>
                      No acertar
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
