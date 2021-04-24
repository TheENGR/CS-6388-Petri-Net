/*globals define, WebGMEGlobal*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed Apr 14 2021 10:39:10 GMT-0500 (Central Daylight Time).
 */

// https://github.com/clientIO/joint/blob/master/demo/petri%20nets/src/pn.js

define(['jointjs', 'css!./styles/SimPetriNetWidget.css'], function (joint) {
	'use strict';

	var WIDGET_CLASS = 'sim-s-m';

	function SimPetriNetWidget(logger, container) {
		this._logger = logger.fork('Widget');

		this._el = container;

		this.nodes = {};
		this._initialize();

		this._logger.debug('ctor finished');
	}

	SimPetriNetWidget.prototype._initialize = function () {
	console.log("_initialize")
		console.log(joint);
		var width = this._el.width(),
			height = this._el.height(),
			self = this;

		// set widget class
		this._el.addClass(WIDGET_CLASS);

		this._jointGraph = new joint.dia.Graph;
		this._jointPaper = new joint.dia.Paper({
			el: this._el,
			width : width,
			height: height,
			gridSize: 10,
			defaultAnchor: { name: 'perpendicular' },
			defaultConnectionPoint: { name: 'boundary' },
			model: this._jointGraph,
			interactive: false,
			elementView: joint.shapes.pn.PlaceView.extend({
				renderTokens: function() { 
					try {
						joint.shapes.pn.PlaceView.prototype.renderTokens.call(this)
					} catch {
						console.log(this.vel)
					}
				}
			})
		});

		this.PetriNet = joint.shapes.pn;
		this._webgmePetriNet = null;
	};

	SimPetriNetWidget.prototype.onWidgetContainerResize = function (width, height) {
		this._logger.debug('Widget is resizing...');
	};

	// State PetriNet manipulating functions called from the controller
	SimPetriNetWidget.prototype.initPetriNet = function (petriNetDescriptor) {
	console.log("initPetriNet")
		const self = this;

		self._webgmePetriNet = petriNetDescriptor;
		self._webgmePetriNet.current = self._webgmePetriNet.init;
		self._jointGraph.clear();
		const petriNet = self._webgmePetriNet;

		// First add the places
		Object.keys(petriNet.places).forEach(ID => {
			petriNet.places[ID].joint = new this.PetriNet.Place({
				position: petriNet.places[ID].position,
				attrs: {
					'.label': {
						'text': petriNet.places[ID].name,
						'fill': '#7c68fc' },
					'.root': {
						'stroke': '#9586fd',
						'stroke-width': 3
					},
					'.tokens > circle': {
						'fill': '#7a7e9b'
					}
				},
				tokens: petriNet.places[ID].tokens
			});
			petriNet.places[ID].joint.addTo(self._jointGraph);
		});
		
		// Then add the transitions
		Object.keys(petriNet.transitions).forEach(ID => {
			petriNet.transitions[ID].joint = new this.PetriNet.Transition({
				position: petriNet.transitions[ID].position,
				attrs: {
					'.label': {
						'text': petriNet.transitions[ID].name,
						'fill': '#fe854f'
					},
					'.root': {
						'fill': '#9586fd',
						'stroke': '#9586fd'
					}
				}
			});
			petriNet.transitions[ID].joint.addTo(self._jointGraph);
		});
		
		// Finally add the links
		Object.keys(petriNet.arcs).forEach(ID => {
			let src = (petriNet.arcs[ID].placeToTransition  ? petriNet.places : petriNet.transitions)[petriNet.arcs[ID].src].joint;
			let dst = (!petriNet.arcs[ID].placeToTransition ? petriNet.places : petriNet.transitions)[petriNet.arcs[ID].dst].joint;
			petriNet.arcs[ID].joint = new this.PetriNet.Link({
				source: { id: src.id, selector: '.root' },
				target: { id: dst.id, selector: '.root' },
				attrs: {
					'.connection': {
						'fill': 'none',
						'stroke-linejoin': 'round',
						'stroke-width': '2',
						'stroke': '#4b4a67'
					}
				}
			});
			petriNet.arcs[ID].joint.addTo(self._jointGraph);
		});


		//now refresh the visualization
		self._decoratePetriNet();
	};

	SimPetriNetWidget.prototype.destroyPetriNet = function () {

	};

	SimPetriNetWidget.prototype.fireEvent = function (fireableTransitions) {
		const self = this;
		const petriNet = self._webgmePetriNet;
		petriNet.setFireableEvents(null)
		
		if (fireableTransitions === undefined) {
			return
		}
		fireableTransitions.forEach(transitionID => {
			var inbound  = self._jointGraph.getConnectedLinks(petriNet.transitions[transitionID].joint, { inbound:  true });
			var outbound = self._jointGraph.getConnectedLinks(petriNet.transitions[transitionID].joint, { outbound: true });
			var placesBefore = inbound.map(link => {
				return link.getSourceElement();
			});
			var placesAfter = outbound.map(link => {
				return link.getTargetElement();
			});
			// https://github.com/clientIO/joint/blob/master/demo/petri%20nets/src/pn.js#L145
			placesBefore.forEach( p => {
				p.set('tokens', p.get('tokens') - 1);
				inbound.filter(l => {
					return l.getSourceElement() === p;
				}).forEach( l => {
					var token = joint.V('circle', { r: 5, fill: '#feb662' });
					l.findView(this._jointPaper).sendToken(token, 500);
				})
			});
			placesAfter.forEach( p => {
				outbound.filter(l => {
					return l.getTargetElement() === p;
				}).forEach( l => {
					var token = joint.V('circle', { r: 5, fill: '#feb662' });
					l.findView(this._jointPaper).sendToken(token, 500, () => {
						p.set('tokens', p.get('tokens') + 1);
						this._decoratePetriNet();
					});
				})
			});
		})
		self._jointPaper.dumpViews();
	};

	SimPetriNetWidget.prototype.resetPetriNet = function () {
		this._webgmePetriNet.current = this._webgmePetriNet.init;
		this._decoratePetriNet();
	};

	SimPetriNetWidget.prototype._decoratePetriNet = function() {
		const petriNet = this._webgmePetriNet;
		
		// https://github.com/clientIO/joint/blob/master/demo/petri%20nets/src/pn.js#L124
		const events = Object.keys(petriNet.transitions).filter(transitionID => {
			var placesBefore = this._jointGraph.getConnectedLinks(petriNet.transitions[transitionID].joint, { inbound: true })
				.map(link => {
					return link.getSourceElement();
				});
			var isFireable = true;
			placesBefore.forEach(p => {
				if (p.get('tokens') === 0) {
					isFireable = false;
				}
			});

			petriNet.transitions[transitionID].joint.attr('body/stroke', isFireable ? 'blue' : '#9586fd');
			
			return isFireable;
		})
		//console.log(events)
		petriNet.setFireableEvents(events)
		//Object.keys(petriNet.places).forEach(p => {
		//	console.log(petriNet.places[p].name)
		//	console.log(petriNet.places[p].joint.get('tokens'))
		//})
	};

	SimPetriNetWidget.prototype._setCurrentState = function(newCurrent) {
		this._webgmePetriNet.current = newCurrent;
		this._decoratePetriNet();
	};
	

	/* * * * * * * * Visualizer event handlers * * * * * * * */

	/* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
	SimPetriNetWidget.prototype.destroy = function () {
	};

	SimPetriNetWidget.prototype.onActivate = function () {
		this._logger.debug('SimPetriNetWidget has been activated');
	};

	SimPetriNetWidget.prototype.onDeactivate = function () {
		this._logger.debug('SimPetriNetWidget has been deactivated');
	};

	return SimPetriNetWidget;
});
