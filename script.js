
// "arbre" mémorise les dieux affichés, dans l'ordre de découverte
const arbre = ["zeus"];

// le niveau (génération) de chaque dieu affiché
const niveaux = { zeus: 0 };

// tous les liens déclarés dans le HTML, lus une seule fois au chargement
const liensBruts = [];
document.querySelectorAll(".dieux a").forEach((lien) => {
    liensBruts.push({
        origine: lien.closest(".dieux").id,
        cible: lien.getAttribute("href").substring(1),
        type: lien.dataset.type, // "enfant", "parent", "frere" ou "conjoint"
    });
});

// on ajoute un bouton "masquer" sur chaque carte, une seule fois au chargement
document.querySelectorAll(".dieux").forEach((carte) => {
    const bouton = document.createElement("button");
    bouton.textContent = "×";
    bouton.classList.add("bouton-masquer");
    bouton.setAttribute("title", "Masquer cette carte");
    bouton.setAttribute("type", "button");

    bouton.addEventListener("click", () => {
        masquerDieu(carte.id);
    });

    carte.appendChild(bouton);
});

// retire un dieu de l'arbre affiché
function masquerDieu(id) {
    const index = arbre.indexOf(id);
    if (index !== -1) {
        arbre.splice(index, 1);
    }
    construireArbre();
}

// écoute des clics : ajoute un dieu à l'arbre et calcule son niveau
document.querySelectorAll(".dieux a").forEach((lien) => {
    lien.addEventListener("click", (event) => {
        event.preventDefault();
        const idCible = lien.getAttribute("href").substring(1);
        const idOrigine = lien.closest(".dieux").id;
        const type = lien.dataset.type;

        if (!arbre.includes(idCible)) {
            arbre.push(idCible);
            if (type === "enfant") {
                niveaux[idCible] = niveaux[idOrigine] + 1;
            } else if (type === "parent") {
                niveaux[idCible] = niveaux[idOrigine] - 1;
            } else if (type === "frere" || type === "conjoint") {
                // un frère/sœur OU un conjoint reste au même niveau
                niveaux[idCible] = niveaux[idOrigine];
            }
        }
        construireArbre();
    });
});

// renvoie l'id du conjoint d'un dieu, ou null s'il n'en a pas
function trouverConjoint(id) {
    const lien = liensBruts.find(
        (b) => b.type === "conjoint" && (b.origine === id || b.cible === id)
    );
    if (!lien) return null;
    return lien.origine === id ? lien.cible : lien.origine;
}

// les liens de filiation (parent → enfant), un seul par enfant
function calculerRelationsFiliation() {
    const relations = [];
    const dejaAjoutees = new Set();

    liensBruts.forEach((brut) => {
        if (brut.type !== "enfant" && brut.type !== "parent") return;
        if (!arbre.includes(brut.origine) || !arbre.includes(brut.cible)) return;

        const parent = brut.type === "enfant" ? brut.origine : brut.cible;
        const enfant = brut.type === "enfant" ? brut.cible : brut.origine;
        const cle = `${parent}:${enfant}`;

        if (!dejaAjoutees.has(cle)) {
            dejaAjoutees.add(cle);
            relations.push({ type: "filiation", parent, enfant });
        }
    });

    return relations;
}

// dit si deux dieux sont déclarés frère/sœur
function sontFreres(idA, idB) {
    return liensBruts.some(
        (b) =>
            b.type === "frere" &&
            ((b.origine === idA && b.cible === idB) ||
                (b.origine === idB && b.cible === idA))
    );
}

// ne relie que les frères/sœurs VOISINS sur une même rangée
function calculerRelationsFreres() {
    const relations = [];
    document.querySelectorAll(".niveau").forEach((rangee) => {
        const cartes = Array.from(rangee.children);
        for (let i = 0; i < cartes.length - 1; i++) {
            const idA = cartes[i].id;
            const idB = cartes[i + 1].id;
            if (sontFreres(idA, idB)) {
                relations.push({ type: "frere", a: idA, b: idB });
            }
        }
    });
    return relations;
}

// les couples actuellement affichés (pour dessiner la barre de mariage)
function calculerRelationsConjoints() {
    const relations = [];
    const dejaAjoutees = new Set();

    liensBruts.forEach((brut) => {
        if (brut.type !== "conjoint") return;
        if (!arbre.includes(brut.origine) || !arbre.includes(brut.cible)) return;

        const paire = [brut.origine, brut.cible].sort();
        const cle = paire.join(":");
        if (!dejaAjoutees.has(cle)) {
            dejaAjoutees.add(cle);
            relations.push({ a: paire[0], b: paire[1] });
        }
    });

    return relations;
}

// organise les cartes affichées en rangées par génération
function construireArbre() {
    const conteneur = document.getElementById("arbre");

    document.querySelectorAll(".dieux").forEach((carte) => {
        carte.style.display = "none";
    });

    conteneur.querySelectorAll(".niveau").forEach((rangee) => {
        while (rangee.firstChild) conteneur.appendChild(rangee.firstChild);
        rangee.remove();
    });

    const parNiveau = {};
    arbre.forEach((id) => {
        const n = niveaux[id];
        if (!parNiveau[n]) parNiveau[n] = [];
        parNiveau[n].push(id);
    });

    const niveauxTries = Object.keys(parNiveau).map(Number).sort((a, b) => a - b);
    niveauxTries.forEach((n) => {
        const rangee = document.createElement("div");
        rangee.classList.add("niveau");
        parNiveau[n].forEach((id) => {
            const carte = document.getElementById(id);
            carte.style.display = "block";
            rangee.appendChild(carte);
        });
        conteneur.appendChild(rangee);
    });

    dessinerLiens();
}

// calcule le point de départ d'une ligne de filiation : soit le milieu
// de la barre de mariage (si le parent a un conjoint affiché), soit le
// bas de la carte du parent seul
function pointDepartFiliation(idParent, rectConteneur) {
    const conjointId = trouverConjoint(idParent);

    if (conjointId && arbre.includes(conjointId)) {
        const pRect = document.getElementById(idParent).getBoundingClientRect();
        const cRect = document.getElementById(conjointId).getBoundingClientRect();
        const centreP = pRect.left + pRect.width / 2;
        const centreC = cRect.left + cRect.width / 2;
        return {
            x: (centreP + centreC) / 2 - rectConteneur.left,
            y: Math.max(pRect.bottom, cRect.bottom) - rectConteneur.top,
        };
    }

    const pRect = document.getElementById(idParent).getBoundingClientRect();
    return {
        x: pRect.left + pRect.width / 2 - rectConteneur.left,
        y: pRect.bottom - rectConteneur.top,
    };
}

// dessine les lignes SVG entre les cartes actuellement affichées
function dessinerLiens() {
    const conteneur = document.getElementById("arbre");
    const ancien = document.getElementById("svg-liens");
    if (ancien) ancien.remove();

    const filiations = calculerRelationsFiliation();
    const freres = calculerRelationsFreres();
    const conjoints = calculerRelationsConjoints();

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.id = "svg-liens";
    svg.setAttribute("width", conteneur.offsetWidth);
    svg.setAttribute("height", conteneur.offsetHeight);
    svg.innerHTML = `
        <defs>
            <marker id="fleche-bas" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" class="pointe-fleche" />
            </marker>
        </defs>
    `;

    const rectConteneur = conteneur.getBoundingClientRect();

    // 1. la barre de mariage entre chaque couple affiché
    conjoints.forEach((rel) => {
        const aRect = document.getElementById(rel.a).getBoundingClientRect();
        const bRect = document.getElementById(rel.b).getBoundingClientRect();
        const y = Math.max(aRect.bottom, bRect.bottom) - rectConteneur.top;
        const gauche = aRect.left < bRect.left ? aRect : bRect;
        const droite = aRect.left < bRect.left ? bRect : aRect;

        const ligne = document.createElementNS(svgNS, "line");
        ligne.setAttribute("x1", gauche.left + gauche.width / 2 - rectConteneur.left);
        ligne.setAttribute("y1", y);
        ligne.setAttribute("x2", droite.left + droite.width / 2 - rectConteneur.left);
        ligne.setAttribute("y2", y);
        ligne.setAttribute("class", "lien-conjoint");
        svg.appendChild(ligne);
    });

    // 2. les lignes de filiation, depuis le milieu du couple (ou le parent seul)
    filiations.forEach((rel) => {
        const depart = pointDepartFiliation(rel.parent, rectConteneur);
        const eRect = document.getElementById(rel.enfant).getBoundingClientRect();

        const ligne = document.createElementNS(svgNS, "line");
        ligne.setAttribute("x1", depart.x);
        ligne.setAttribute("y1", depart.y);
        ligne.setAttribute("x2", eRect.left + eRect.width / 2 - rectConteneur.left);
        ligne.setAttribute("y2", eRect.top - rectConteneur.top);
        ligne.setAttribute("class", "lien-filiation");
        ligne.setAttribute("marker-end", "url(#fleche-bas)");
        svg.appendChild(ligne);
    });

    // 3. les traits horizontaux entre frères et sœurs voisins
    freres.forEach((rel) => {
        const aRect = document.getElementById(rel.a).getBoundingClientRect();
        const bRect = document.getElementById(rel.b).getBoundingClientRect();
        const y = (aRect.top + aRect.bottom) / 2 - rectConteneur.top;
        const gauche = aRect.left < bRect.left ? aRect : bRect;
        const droite = aRect.left < bRect.left ? bRect : aRect;

        const ligne = document.createElementNS(svgNS, "line");
        ligne.setAttribute("x1", gauche.right - rectConteneur.left);
        ligne.setAttribute("y1", y);
        ligne.setAttribute("x2", droite.left - rectConteneur.left);
        ligne.setAttribute("y2", y);
        ligne.setAttribute("class", "lien-frere");
        svg.appendChild(ligne);
    });

    conteneur.prepend(svg);
}

// premier affichage au chargement de la page
construireArbre();