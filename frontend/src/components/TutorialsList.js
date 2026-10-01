import React, { useState, useEffect } from "react";
import TutorialDataService from "../services/TutorialService";
import { Link } from "react-router-dom";
import { estadoLegible } from "../lib/tutorials";

const TutorialsList = () => {
  const [tutorials, setTutorials] = useState([]);
  const [currentTutorial, setCurrentTutorial] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [searchTitle, setSearchTitle] = useState("");

  useEffect(() => {
    retrieveTutorials();
  }, []);

  const onChangeSearchTitle = e => {
    const searchTitle = e.target.value;
    setSearchTitle(searchTitle);
  };

  const retrieveTutorials = () => {
    TutorialDataService.getAll()
      .then(response => {
        setTutorials(response.data);
      })
      .catch(e => {
        console.log(e);
      });
  };

  const refreshList = () => {
    retrieveTutorials();
    setCurrentTutorial(null);
    setCurrentIndex(-1);
  };

  const setActiveTutorial = (tutorial, index) => {
    setCurrentTutorial(tutorial);
    setCurrentIndex(index);
  };

  // Borrar de a uno. Antes solo existia "Remove All": para limpiar un tutorial
  // habia que vaciar la lista entera, asi que una prueba que crea un dato no
  // tenia forma de sacar el suyo sin llevarse los demas por delante.
  const removeTutorial = (tutorial, event) => {
    // El <li> tiene su propio onClick (seleccionar): sin esto, el click del
    // boton tambien lo dispara.
    event.stopPropagation();

    TutorialDataService.remove(tutorial.id)
      .then(() => {
        refreshList();
      })
      .catch(e => {
        console.log(e);
      });
  };

  const removeAllTutorials = () => {
    TutorialDataService.removeAll()
      .then(response => {
        refreshList();
      })
      .catch(e => {
        console.log(e);
      });
  };

  const findByTitle = () => {
    TutorialDataService.findByTitle(searchTitle)
      .then(response => {
        setTutorials(response.data);
      })
      .catch(e => {
        console.log(e);
      });
  };

  return (
    <div className="list row">
      <div className="col-md-8">
        <div className="input-group mb-3">
          {/* sr-only: no se ve, pero le da nombre al campo. Sin esto el buscador
              es un input sin etiqueta: un lector de pantalla no sabe que es. */}
          <label htmlFor="search-title" className="sr-only">
            Buscar por titulo
          </label>
          <input
            type="text"
            className="form-control"
            id="search-title"
            placeholder="Search by title"
            value={searchTitle}
            onChange={onChangeSearchTitle}
          />
          <div className="input-group-append">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={findByTitle}
            >
              Search
            </button>
          </div>
        </div>
      </div>
      <div className="col-md-6">
        <h4>Tutorials List</h4>

        <ul className="list-group" aria-label="Tutoriales">
          {tutorials &&
            tutorials.map((tutorial, index) => (
              <li
                className={
                  "list-group-item d-flex justify-content-between align-items-center " +
                  (index === currentIndex ? "active" : "")
                }
                onClick={() => setActiveTutorial(tutorial, index)}
                key={tutorial.id || index}
              >
                <span>{tutorial.title}</span>
                {/* El nombre lleva el titulo adentro: con varios tutoriales en
                    pantalla hay un boton distinto por fila, y se puede pedir el
                    de uno sin tocar los otros. */}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label={"Borrar " + tutorial.title}
                  onClick={event => removeTutorial(tutorial, event)}
                >
                  Borrar
                </button>
              </li>
            ))}
        </ul>

        <button
          className="m-3 btn btn-sm btn-danger"
          onClick={removeAllTutorials}
        >
          Remove All
        </button>
      </div>
      <div className="col-md-6">
        {currentTutorial ? (
          <div>
            <h4>Tutorial</h4>
            <div>
              <label>
                <strong>Title:</strong>
              </label>{" "}
              {currentTutorial.title}
            </div>
            <div>
              <label>
                <strong>Description:</strong>
              </label>{" "}
              {currentTutorial.description}
            </div>
            <div>
              <label>
                <strong>Status:</strong>
              </label>{" "}
              {estadoLegible(currentTutorial)}
            </div>

            <Link
              to={"/tutorials/" + currentTutorial.id}
              className="badge badge-warning"
            >
              Edit
            </Link>
          </div>
        ) : (
          <div>
            <br />
            <p>Please click on a Tutorial...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorialsList;
