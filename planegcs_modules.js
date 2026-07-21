var _PlanegcsModules = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // planegcs_entry.js
  var planegcs_entry_exports = {};
  __export(planegcs_entry_exports, {
    GcsWrapper: () => GcsWrapper,
    SolveStatus: () => SolveStatus
  });

  // node_modules/@salusoft89/planegcs/dist/planegcs_dist/constraint_param_index.js
  var constraint_param_index = {
    equal: {
      param1: "object_param_or_number",
      param2: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type",
      internalalignment: "primitive_type"
    },
    proportional: {
      param1: "object_param_or_number",
      param2: "object_param_or_number",
      ratio: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    difference: {
      param1: "object_param_or_number",
      param2: "object_param_or_number",
      difference: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2p_distance: {
      p1_id: "object_id",
      p2_id: "object_id",
      distance: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2p_angle_incr_angle: {
      p1_id: "object_id",
      p2_id: "object_id",
      angle: "object_param_or_number",
      incrAngle: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2p_angle: {
      p1_id: "object_id",
      p2_id: "object_id",
      angle: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2l_distance: {
      p_id: "object_id",
      l_id: "object_id",
      distance: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_line_pl: {
      p_id: "object_id",
      l_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_line_ppp: {
      p_id: "object_id",
      lp1_id: "object_id",
      lp2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_perp_bisector_pl: {
      p_id: "object_id",
      l_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_perp_bisector_ppp: {
      p_id: "object_id",
      lp1_id: "object_id",
      lp2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    parallel: {
      l1_id: "object_id",
      l2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    perpendicular_ll: {
      l1_id: "object_id",
      l2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    perpendicular_pppp: {
      l1p1_id: "object_id",
      l1p2_id: "object_id",
      l2p1_id: "object_id",
      l2p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    l2l_angle_ll: {
      l1_id: "object_id",
      l2_id: "object_id",
      angle: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    l2l_angle_pppp: {
      l1p1_id: "object_id",
      l1p2_id: "object_id",
      l2p1_id: "object_id",
      l2p2_id: "object_id",
      angle: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    angle_via_point: {
      crv1_id: "object_id",
      crv2_id: "object_id",
      p_id: "object_id",
      angle: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    angle_via_two_points: {
      crv1_id: "object_id",
      crv2_id: "object_id",
      p1_id: "object_id",
      p2_id: "object_id",
      angle: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    angle_via_point_and_param: {
      crv1_id: "object_id",
      crv2_id: "object_id",
      p_id: "object_id",
      cparam: "object_param_or_number",
      angle: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    angle_via_point_and_two_params: {
      crv1_id: "object_id",
      crv2_id: "object_id",
      p_id: "object_id",
      cparam1: "object_param_or_number",
      cparam2: "object_param_or_number",
      angle: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    midpoint_on_line_ll: {
      l1_id: "object_id",
      l2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    midpoint_on_line_pppp: {
      l1p1_id: "object_id",
      l1p2_id: "object_id",
      l2p1_id: "object_id",
      l2p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_circumf: {
      p1_id: "object_id",
      p2_id: "object_id",
      rd1: "object_param_or_number",
      rd2: "object_param_or_number",
      internal: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_at_bspline_knot: {
      b_id: "object_id",
      l_id: "object_id",
      knotindex: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2p_coincident: {
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    horizontal_l: {
      l_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    horizontal_pp: {
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    vertical_l: {
      l_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    vertical_pp: {
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    coordinate_x: {
      p_id: "object_id",
      x: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    coordinate_y: {
      p_id: "object_id",
      y: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    arc_rules: {
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_circle: {
      p_id: "object_id",
      c_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_ellipse: {
      p_id: "object_id",
      e_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_hyperbolic_arc: {
      p_id: "object_id",
      e_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_parabolic_arc: {
      p_id: "object_id",
      e_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_bspline: {
      p_id: "object_id",
      b_id: "object_id",
      pointparam: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    arc_of_ellipse_rules: {
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    curve_value: {
      p_id: "object_id",
      a_id: "object_id",
      u: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    arc_of_hyperbola_rules: {
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    arc_of_parabola_rules: {
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    point_on_arc: {
      p_id: "object_id",
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    perpendicular_line2arc: {
      p1_id: "object_id",
      p2_id: "object_id",
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    perpendicular_arc2line: {
      a_id: "object_id",
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    perpendicular_circle2arc: {
      center_id: "object_id",
      radius: "object_param_or_number",
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    perpendicular_arc2circle: {
      a_id: "object_id",
      center_id: "object_id",
      radius: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    perpendicular_arc2arc: {
      a1_id: "object_id",
      reverse1: "primitive_type",
      a2_id: "object_id",
      reverse2: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_lc: {
      l_id: "object_id",
      c_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_le: {
      l_id: "object_id",
      e_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_la: {
      l_id: "object_id",
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_cc: {
      c1_id: "object_id",
      c2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_aa: {
      a1_id: "object_id",
      a2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    tangent_ca: {
      c_id: "object_id",
      a_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    circle_radius: {
      c_id: "object_id",
      radius: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    arc_radius: {
      a_id: "object_id",
      radius: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    circle_diameter: {
      c_id: "object_id",
      diameter: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    arc_diameter: {
      a_id: "object_id",
      diameter: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    equal_length: {
      l1_id: "object_id",
      l2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    equal_radius_cc: {
      c1_id: "object_id",
      c2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    equal_radii_ee: {
      e1_id: "object_id",
      e2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    equal_radii_ahah: {
      a1_id: "object_id",
      a2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    equal_radius_ca: {
      c1_id: "object_id",
      a2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    equal_radius_aa: {
      a1_id: "object_id",
      a2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    equal_focus: {
      a1_id: "object_id",
      a2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2p_symmetric_ppl: {
      p1_id: "object_id",
      p2_id: "object_id",
      l_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2p_symmetric_ppp: {
      p1_id: "object_id",
      p2_id: "object_id",
      p_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    snells_law: {
      ray1_id: "object_id",
      ray2_id: "object_id",
      boundary_id: "object_id",
      p_id: "object_id",
      n1: "object_param_or_number",
      n2: "object_param_or_number",
      flipn1: "primitive_type",
      flipn2: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    c2cdistance: {
      c1_id: "object_id",
      c2_id: "object_id",
      dist: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    c2ldistance: {
      c_id: "object_id",
      l_id: "object_id",
      dist: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    p2cdistance: {
      p_id: "object_id",
      c_id: "object_id",
      distance: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    arc_length: {
      a_id: "object_id",
      dist: "object_param_or_number",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_point2ellipse: {
      e_id: "object_id",
      p1_id: "object_id",
      alignmentType: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_ellipse_major_diameter: {
      e_id: "object_id",
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_ellipse_minor_diameter: {
      e_id: "object_id",
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_ellipse_focus1: {
      e_id: "object_id",
      p1_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_ellipse_focus2: {
      e_id: "object_id",
      p1_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_point2hyperbola: {
      e_id: "object_id",
      p1_id: "object_id",
      alignmentType: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_hyperbola_major_diameter: {
      e_id: "object_id",
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_hyperbola_minor_diameter: {
      e_id: "object_id",
      p1_id: "object_id",
      p2_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_hyperbola_focus: {
      e_id: "object_id",
      p1_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_parabola_focus: {
      e_id: "object_id",
      p1_id: "object_id",
      tagId: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_bspline_control_point: {
      b_id: "object_id",
      c_id: "object_id",
      poleindex: "primitive_type",
      tag: "primitive_type",
      driving: "primitive_type"
    },
    internal_alignment_knot_point: {
      b_id: "object_id",
      p_id: "object_id",
      knotindex: "primitive_type",
      tagId: "primitive_type",
      driving: "primitive_type"
    }
  };

  // node_modules/@salusoft89/planegcs/dist/sketch/sketch_primitive.js
  var GEOMETRY_TYPES = ["point", "line", "circle", "arc", "ellipse", "arc_of_ellipse", "hyperbola", "arc_of_hyperbola", "parabola", "arc_of_parabola", "bspline"];
  function is_sketch_geometry(primitive) {
    if (primitive === void 0 || primitive.type === "param") {
      return false;
    }
    return GEOMETRY_TYPES.includes(primitive.type);
  }
  function is_sketch_constraint(primitive) {
    if (primitive === void 0) {
      return false;
    }
    return !is_sketch_geometry(primitive);
  }

  // node_modules/@salusoft89/planegcs/dist/sketch/sketch_index.js
  var SketchIndexBase = class {
    get_primitive_or_fail(id) {
      const obj = this.get_primitive(id);
      if (obj === void 0) {
        throw new Error(`sketch object ${id} not found`);
      }
      return obj;
    }
    get_sketch_point(id) {
      const obj = this.get_primitive_or_fail(id);
      if (obj.type !== "point") {
        throw new Error(`sketch object ${id} is not a sketch point`);
      }
      return obj;
    }
    get_sketch_line(id) {
      const obj = this.get_primitive_or_fail(id);
      if (obj.type !== "line") {
        throw new Error(`sketch object ${id} is not a sketch line`);
      }
      return obj;
    }
    get_sketch_circle(id) {
      const obj = this.get_primitive_or_fail(id);
      if (obj.type !== "circle") {
        throw new Error(`sketch object ${id} is not a sketch circle`);
      }
      return obj;
    }
    get_sketch_arc(id) {
      const obj = this.get_primitive_or_fail(id);
      if (obj.type !== "arc") {
        throw new Error(`sketch object ${id} is not a sketch arc`);
      }
      return obj;
    }
    get_constraints() {
      return this.get_primitives().filter((o) => !is_sketch_geometry(o));
    }
    toString() {
      return this.get_primitives().map((o) => JSON.stringify(o)).join("\n");
    }
  };
  var SketchIndex = class extends SketchIndexBase {
    constructor() {
      super(...arguments);
      this.index = /* @__PURE__ */ new Map();
      this.primitive_ids = [];
    }
    has(id) {
      return this.index.has(id);
    }
    delete_primitive(id) {
      return this.index.delete(id);
    }
    set_primitive(obj) {
      if (!this.has(obj.id)) {
        this.primitive_ids.push(obj.id);
      }
      this.index.set(obj.id, obj);
    }
    get_primitive(id) {
      return this.index.get(id);
    }
    get_primitives() {
      return Array.from(this.index.values());
    }
    get_id_by_index(index) {
      return this.primitive_ids[index - 1];
    }
    clear() {
      this.index.clear();
      this.primitive_ids = [];
    }
    counter() {
      return this.primitive_ids.length;
    }
  };

  // node_modules/@salusoft89/planegcs/dist/sketch/emsc_vectors.js
  function arr_to_intvec(gcs_module, arr) {
    const vec = new gcs_module.IntVector();
    for (const val of arr) {
      vec.push_back(val);
    }
    return vec;
  }
  function emsc_vec_to_arr(vec) {
    const result = [];
    for (let i = 0; i < vec.size(); ++i) {
      result.push(vec.get(i));
    }
    vec.delete();
    return result;
  }

  // node_modules/@salusoft89/planegcs/dist/planegcs_dist/enums.js
  var Constraint_Alignment = {
    NoInternalAlignment: 0,
    InternalAlignment: 1
  };
  var SolveStatus = {
    Success: 0,
    Converged: 1,
    Failed: 2,
    SuccessfulSolutionInvalid: 3
  };
  var Algorithm = {
    BFGS: 0,
    LevenbergMarquardt: 1,
    DogLeg: 2
  };

  // node_modules/@salusoft89/planegcs/dist/sketch/geom_params.js
  var property_offsets = {
    point: {
      x: 0,
      y: 1
    },
    circle: {
      radius: 0
    },
    arc: {
      start_angle: 0,
      end_angle: 1,
      radius: 2
    },
    ellipse: {
      radmin: 0
    },
    arc_of_ellipse: {
      start_angle: 0,
      end_angle: 1,
      radmin: 2
    },
    parabola: {},
    arc_of_parabola: {
      start_angle: 0,
      end_angle: 1
    },
    hyperbola: {
      radmin: 0
    },
    arc_of_hyperbola: {
      start_angle: 0,
      end_angle: 1,
      radmin: 2
    },
    line: {},
    bspline: {}
  };
  function get_property_offset(primitive_type, property_key) {
    const primitive_offsets = property_offsets[primitive_type];
    if (primitive_offsets) {
      const offset = primitive_offsets[property_key];
      if (offset !== void 0) {
        return offset;
      }
    }
    throw new Error(`Unknown property ${property_key} for primitive <${primitive_type}>`);
  }

  // node_modules/@salusoft89/planegcs/dist/sketch/gcs_wrapper.js
  var GcsWrapper = class {
    get debug_mode() {
      return this.gcs.get_debug_mode();
    }
    set debug_mode(mode) {
      this.gcs.set_debug_mode(mode);
    }
    get equal_optimization() {
      return this.enable_equal_optimization;
    }
    set equal_optimization(val) {
      this.enable_equal_optimization = val;
    }
    constructor(gcs, mod) {
      this.p_param_index = /* @__PURE__ */ new Map();
      this.sketch_index = new SketchIndex();
      this.bspline_gcs_cache = /* @__PURE__ */ new Map();
      this.sketch_param_index = /* @__PURE__ */ new Map();
      this.nondriving_constraint_params_order = /* @__PURE__ */ new Map();
      this.enable_equal_optimization = false;
      this.gcs = gcs;
      this.module = mod;
    }
    destroy_gcs_module() {
      this.gcs.clear_data();
      this.gcs.delete();
    }
    clear_data() {
      this.nondriving_constraint_params_order.clear();
      this.gcs.clear_data();
      this.p_param_index.clear();
      this.sketch_param_index.clear();
      this.sketch_index.clear();
      this.bspline_gcs_cache.clear();
    }
    // ------ Sketch -> GCS ------- (when building up a sketch)
    push_primitive(o) {
      switch (o.type) {
        case "point":
          this.push_point(o);
          break;
        case "line":
          this.push_line(o);
          break;
        case "circle":
          this.push_circle(o);
          break;
        case "arc":
          this.push_arc(o);
          break;
        case "ellipse":
          this.push_ellipse(o);
          break;
        case "arc_of_ellipse":
          this.push_arc_of_ellipse(o);
          break;
        case "hyperbola":
          this.push_hyperbola(o);
          break;
        case "arc_of_hyperbola":
          this.push_arc_of_hyperbola(o);
          break;
        case "parabola":
          this.push_parabola(o);
          break;
        case "arc_of_parabola":
          this.push_arc_of_parabola(o);
          break;
        case "bspline":
          this.push_bspline(o);
          break;
        default:
          this.push_constraint(o);
      }
      if (this.sketch_index.has(o.id)) {
        throw new Error(`object with id ${o.id} already exists`);
      }
      this.sketch_index.set_primitive(o);
    }
    push_primitives_and_params(objects) {
      for (const o of objects) {
        if (o.type === "param") {
          this.push_sketch_param(o.name, o.value);
        } else {
          this.push_primitive(o);
        }
      }
    }
    solve(algorithm = Algorithm.DogLeg) {
      return this.gcs.solve_system(algorithm);
    }
    apply_solution() {
      this.gcs.apply_solution();
      for (const obj of this.sketch_index.get_primitives()) {
        this.pull_primitive(obj);
      }
    }
    set_convergence_threshold(threshold) {
      this.gcs.set_covergence_threshold(threshold);
    }
    get_convergence_threshold() {
      return this.gcs.get_convergence_threshold();
    }
    set_max_iterations(n) {
      this.gcs.set_max_iterations(n);
    }
    get_max_iterations() {
      return this.gcs.get_max_iterations();
    }
    get_gcs_params() {
      return emsc_vec_to_arr(this.gcs.get_p_params());
    }
    get_gcs_conflicting_constraints() {
      return emsc_vec_to_arr(this.gcs.get_conflicting()).map((i) => this.sketch_index.get_id_by_index(i));
    }
    get_gcs_redundant_constraints() {
      return emsc_vec_to_arr(this.gcs.get_redundant()).map((i) => this.sketch_index.get_id_by_index(i));
    }
    get_gcs_partially_redundant_constraints() {
      return emsc_vec_to_arr(this.gcs.get_partially_redundant()).map((i) => this.sketch_index.get_id_by_index(i));
    }
    has_gcs_conflicting_constraints() {
      return this.gcs.has_conflicting();
    }
    has_gcs_redundant_constraints() {
      return this.gcs.has_redundant();
    }
    has_gcs_partially_redundant_constraints() {
      return this.gcs.has_partially_redundant();
    }
    push_sketch_param(name, value, fixed = true) {
      const pos = this.gcs.params_size();
      this.gcs.push_p_param(value, fixed);
      this.sketch_param_index.set(name, pos);
      return pos;
    }
    set_sketch_param(name, value) {
      const pos = this.sketch_param_index.get(name);
      if (pos === void 0) {
        throw new Error(`sketch param ${name} not found`);
      }
      this.gcs.set_p_param(pos, value, true);
    }
    get_sketch_param_value(name) {
      const pos = this.sketch_param_index.get(name);
      return pos === void 0 ? void 0 : this.gcs.get_p_param(pos);
    }
    get_sketch_param_values() {
      const result = /* @__PURE__ */ new Map();
      for (const [name, pos] of this.sketch_param_index) {
        result.set(name, this.gcs.get_p_param(pos));
      }
      return result;
    }
    push_p_params(id, values, fixed = false) {
      const pos = this.gcs.params_size();
      for (const value of values) {
        this.gcs.push_p_param(value, fixed);
      }
      if (!this.p_param_index.has(id)) {
        this.p_param_index.set(id, pos);
      }
      return pos;
    }
    push_point(p) {
      if (this.p_param_index.has(p.id)) {
        return;
      }
      this.push_p_params(p.id, [p.x, p.y], p.fixed);
    }
    push_line(l) {
      const p1 = this.sketch_index.get_sketch_point(l.p1_id);
      const p2 = this.sketch_index.get_sketch_point(l.p2_id);
      this.push_point(p1);
      this.push_point(p2);
    }
    push_circle(c) {
      const p = this.sketch_index.get_sketch_point(c.c_id);
      this.push_point(p);
      this.push_p_params(c.id, [c.radius], false);
    }
    push_arc(a) {
      const center = this.sketch_index.get_sketch_point(a.c_id);
      this.push_point(center);
      const start = this.sketch_index.get_sketch_point(a.start_id);
      this.push_point(start);
      const end = this.sketch_index.get_sketch_point(a.end_id);
      this.push_point(end);
      this.push_p_params(a.id, [a.start_angle, a.end_angle, a.radius], false);
    }
    push_ellipse(e) {
      const center = this.sketch_index.get_sketch_point(e.c_id);
      this.push_point(center);
      const focus1 = this.sketch_index.get_sketch_point(e.focus1_id);
      this.push_point(focus1);
      this.push_p_params(e.id, [e.radmin], false);
    }
    push_hyperbola(h) {
      const center = this.sketch_index.get_sketch_point(h.c_id);
      this.push_point(center);
      const focus1 = this.sketch_index.get_sketch_point(h.focus1_id);
      this.push_point(focus1);
      this.push_p_params(h.id, [h.radmin], false);
    }
    push_arc_of_hyperbola(ah) {
      const center = this.sketch_index.get_sketch_point(ah.c_id);
      this.push_point(center);
      const focus1 = this.sketch_index.get_sketch_point(ah.focus1_id);
      this.push_point(focus1);
      const start = this.sketch_index.get_sketch_point(ah.start_id);
      this.push_point(start);
      const end = this.sketch_index.get_sketch_point(ah.end_id);
      this.push_point(end);
      this.push_p_params(ah.id, [ah.start_angle, ah.end_angle, ah.radmin], false);
    }
    push_parabola(p) {
      const vertex = this.sketch_index.get_sketch_point(p.vertex_id);
      this.push_point(vertex);
      const focus1 = this.sketch_index.get_sketch_point(p.focus1_id);
      this.push_point(focus1);
    }
    push_arc_of_parabola(ap) {
      const vertex = this.sketch_index.get_sketch_point(ap.vertex_id);
      this.push_point(vertex);
      const focus1 = this.sketch_index.get_sketch_point(ap.focus1_id);
      this.push_point(focus1);
      const start = this.sketch_index.get_sketch_point(ap.start_id);
      this.push_point(start);
      const end = this.sketch_index.get_sketch_point(ap.end_id);
      this.push_point(end);
      this.push_p_params(ap.id, [ap.start_angle, ap.end_angle], false);
    }
    push_arc_of_ellipse(ae) {
      const center = this.sketch_index.get_sketch_point(ae.c_id);
      this.push_point(center);
      const focus1 = this.sketch_index.get_sketch_point(ae.focus1_id);
      this.push_point(focus1);
      const start = this.sketch_index.get_sketch_point(ae.start_id);
      this.push_point(start);
      const end = this.sketch_index.get_sketch_point(ae.end_id);
      this.push_point(end);
      this.push_p_params(ae.id, [ae.start_angle, ae.end_angle, ae.radmin], false);
    }
    push_bspline(b) {
      for (const poleId of b.pole_ids) {
        const pole = this.sketch_index.get_sketch_point(poleId);
        this.push_point(pole);
      }
    }
    sketch_primitive_to_gcs(o) {
      switch (o.type) {
        case "point": {
          const p_i = this.get_primitive_addr(o.id);
          return this.gcs.make_point(p_i + property_offsets.point.x, p_i + property_offsets.point.y);
        }
        case "line": {
          const p1_i = this.get_primitive_addr(o.p1_id);
          const p2_i = this.get_primitive_addr(o.p2_id);
          return this.gcs.make_line(p1_i + property_offsets.point.x, p1_i + property_offsets.point.y, p2_i + property_offsets.point.x, p2_i + property_offsets.point.y);
        }
        case "circle": {
          const cp_i = this.get_primitive_addr(o.c_id);
          const circle_i = this.get_primitive_addr(o.id);
          return this.gcs.make_circle(cp_i + property_offsets.point.x, cp_i + property_offsets.point.y, circle_i + property_offsets.circle.radius);
        }
        case "arc": {
          const c_i = this.get_primitive_addr(o.c_id);
          const start_i = this.get_primitive_addr(o.start_id);
          const end_i = this.get_primitive_addr(o.end_id);
          const a_i = this.get_primitive_addr(o.id);
          return this.gcs.make_arc(c_i + property_offsets.point.x, c_i + property_offsets.point.y, start_i + property_offsets.point.x, start_i + property_offsets.point.y, end_i + property_offsets.point.x, end_i + property_offsets.point.y, a_i + property_offsets.arc.start_angle, a_i + property_offsets.arc.end_angle, a_i + property_offsets.arc.radius);
        }
        case "ellipse": {
          const c_i = this.get_primitive_addr(o.c_id);
          const focus1_i = this.get_primitive_addr(o.focus1_id);
          const radmin_i = this.get_primitive_addr(o.id);
          return this.gcs.make_ellipse(c_i + property_offsets.point.x, c_i + property_offsets.point.y, focus1_i + property_offsets.point.x, focus1_i + property_offsets.point.y, radmin_i + property_offsets.ellipse.radmin);
        }
        case "arc_of_ellipse": {
          const c_i = this.get_primitive_addr(o.c_id);
          const focus1_i = this.get_primitive_addr(o.focus1_id);
          const start_i = this.get_primitive_addr(o.start_id);
          const end_i = this.get_primitive_addr(o.end_id);
          const a_i = this.get_primitive_addr(o.id);
          return this.gcs.make_arc_of_ellipse(c_i + property_offsets.point.x, c_i + property_offsets.point.y, focus1_i + property_offsets.point.x, focus1_i + property_offsets.point.y, start_i + property_offsets.point.x, start_i + property_offsets.point.y, end_i + property_offsets.point.x, end_i + property_offsets.point.y, a_i + property_offsets.arc_of_ellipse.start_angle, a_i + property_offsets.arc_of_ellipse.end_angle, a_i + property_offsets.arc_of_ellipse.radmin);
        }
        case "hyperbola": {
          const c_i = this.get_primitive_addr(o.c_id);
          const focus1_i = this.get_primitive_addr(o.focus1_id);
          const radmin_i = this.get_primitive_addr(o.id + property_offsets.hyperbola.radmin);
          return this.gcs.make_hyperbola(c_i + property_offsets.point.x, c_i + property_offsets.point.y, focus1_i + property_offsets.point.x, focus1_i + property_offsets.point.y, radmin_i + property_offsets.hyperbola.radmin);
        }
        case "arc_of_hyperbola": {
          const c_i = this.get_primitive_addr(o.c_id);
          const focus1_i = this.get_primitive_addr(o.focus1_id);
          const start_i = this.get_primitive_addr(o.start_id);
          const end_i = this.get_primitive_addr(o.end_id);
          const a_i = this.get_primitive_addr(o.id);
          return this.gcs.make_arc_of_hyperbola(c_i + property_offsets.point.x, c_i + property_offsets.point.y, focus1_i + property_offsets.point.x, focus1_i + property_offsets.point.y, start_i + property_offsets.point.x, start_i + property_offsets.point.y, end_i + property_offsets.point.x, end_i + property_offsets.point.y, a_i + property_offsets.arc_of_hyperbola.start_angle, a_i + property_offsets.arc_of_hyperbola.end_angle, a_i + property_offsets.arc_of_hyperbola.radmin);
        }
        case "parabola": {
          const vertex_i = this.get_primitive_addr(o.vertex_id);
          const focus1_i = this.get_primitive_addr(o.focus1_id);
          return this.gcs.make_parabola(vertex_i + property_offsets.point.x, vertex_i + property_offsets.point.y, focus1_i + property_offsets.point.x, focus1_i + property_offsets.point.y);
        }
        case "arc_of_parabola": {
          const vertex_i = this.get_primitive_addr(o.vertex_id);
          const focus1_i = this.get_primitive_addr(o.focus1_id);
          const start_i = this.get_primitive_addr(o.start_id);
          const end_i = this.get_primitive_addr(o.end_id);
          const a_i = this.get_primitive_addr(o.id);
          return this.gcs.make_arc_of_parabola(vertex_i + property_offsets.point.x, vertex_i + property_offsets.point.y, focus1_i + property_offsets.point.x, focus1_i + property_offsets.point.y, start_i + property_offsets.point.x, start_i + property_offsets.point.y, end_i + property_offsets.point.x, end_i + property_offsets.point.y, a_i + property_offsets.arc_of_parabola.start_angle, a_i + property_offsets.arc_of_parabola.end_angle);
        }
        case "bspline": {
          if (!this.module)
            throw new Error("ModuleStatic required for BSpline creation");
          const b = o;
          const cached = this.bspline_gcs_cache.get(b.id);
          if (cached !== void 0)
            return cached;
          if (b.pole_ids.length < 2) {
            throw new Error("BSpline must have at least 2 control points, got " + b.pole_ids.length);
          }
          const poleIndices = [];
          for (const poleId of b.pole_ids) {
            const addr = this.get_primitive_addr(poleId);
            poleIndices.push(addr + property_offsets.point.x);
            poleIndices.push(addr + property_offsets.point.y);
          }
          const startx_i = this.gcs.push_p_param(this.gcs.get_p_param(poleIndices[0]), false);
          const starty_i = this.gcs.push_p_param(this.gcs.get_p_param(poleIndices[1]), false);
          const endx_i = this.gcs.push_p_param(this.gcs.get_p_param(poleIndices[poleIndices.length - 2]), false);
          const endy_i = this.gcs.push_p_param(this.gcs.get_p_param(poleIndices[poleIndices.length - 1]), false);
          const weightIndices = [];
          for (const w of b.weights) {
            weightIndices.push(this.gcs.push_p_param(w, true));
          }
          const knotIndices = [];
          for (const k of b.knots) {
            knotIndices.push(this.gcs.push_p_param(k, true));
          }
          const polesVec = arr_to_intvec(this.module, poleIndices);
          const weightsVec = arr_to_intvec(this.module, weightIndices);
          const knotsVec = arr_to_intvec(this.module, knotIndices);
          const multVec = arr_to_intvec(this.module, b.mult);
          const result = this.gcs.make_bspline(startx_i, starty_i, endx_i, endy_i, polesVec, weightsVec, knotsVec, multVec, b.degree, b.periodic);
          this.bspline_gcs_cache.set(b.id, result);
          return result;
        }
        default:
          throw new Error(`not-implemented object type: ${o.type}`);
      }
    }
    push_constraint(c) {
      var _a, _b, _c, _d;
      const add_constraint_args = [];
      const deletable = [];
      const constraint_params = constraint_param_index[c.type];
      if (constraint_params === void 0) {
        throw new Error(`unknown constraint type: ${c.type}`);
      }
      let numeric_tag_id = -1;
      if (!c.temporary) {
        numeric_tag_id = this.sketch_index.counter() + 1;
      }
      for (const parameter of Object.keys(constraint_params)) {
        const type = constraint_params[parameter];
        if (type === void 0) {
          throw new Error(`unknown parameter type: ${type} in constraint ${c.type}`);
        }
        if (parameter === "tagId") {
          add_constraint_args.push(numeric_tag_id);
          continue;
        }
        if (parameter === "driving") {
          add_constraint_args.push((_a = c.driving) !== null && _a !== void 0 ? _a : true);
          continue;
        }
        if (parameter === "internalalignment" && c.type === "equal") {
          add_constraint_args.push((_b = c.internalalignment) !== null && _b !== void 0 ? _b : Constraint_Alignment.NoInternalAlignment);
          continue;
        }
        const val = c[parameter];
        const is_fixed = (_c = c.driving) !== null && _c !== void 0 ? _c : true;
        if (type === "object_param_or_number") {
          if (typeof val === "number") {
            if (!c.driving) {
              const list = this.nondriving_constraint_params_order.get(c.id);
              if (list === void 0) {
                this.nondriving_constraint_params_order.set(c.id, [parameter]);
              } else {
                list.push(parameter);
              }
            }
            const pos = this.push_p_params(c.id, [val], is_fixed);
            add_constraint_args.push(pos);
          } else if (typeof val === "string") {
            const param_addr = this.sketch_param_index.get(val);
            if (param_addr === void 0) {
              throw new Error(`couldn't parse object param: ${parameter} in constraint ${c.type}: unknown param ${val}`);
            }
            add_constraint_args.push(param_addr);
          } else if (typeof val === "boolean") {
            add_constraint_args.push(val);
          } else if (val !== void 0) {
            const ref_primitive = this.sketch_index.get_primitive_or_fail(val.o_id);
            if (!is_sketch_geometry(ref_primitive)) {
              throw new Error(`Primitive #${val.o_id} (${ref_primitive.type}) is not supported to be referenced from a constraint.`);
            }
            const param_addr = this.get_primitive_addr(val.o_id) + get_property_offset(ref_primitive.type, val.prop);
            add_constraint_args.push(param_addr);
          }
        } else if (type === "object_id" && typeof val === "string") {
          const obj = this.sketch_index.get_primitive_or_fail(val);
          const gcs_obj = this.sketch_primitive_to_gcs(obj);
          add_constraint_args.push(gcs_obj);
          if (obj.type !== "bspline") {
            deletable.push(gcs_obj);
          }
        } else if (type === "primitive_type" && (typeof val === "number" || typeof val === "boolean")) {
          add_constraint_args.push(val);
        } else {
          throw new Error(`unhandled parameter ${parameter} type: ${type}`);
        }
      }
      const c_name = c.type;
      this.gcs[`add_constraint_${c_name}`](...add_constraint_args, (_d = c.scale) !== null && _d !== void 0 ? _d : 1);
      if (this.enable_equal_optimization && c_name === "equal") {
        const [param_1_addr, param_2_addr] = [add_constraint_args[0], add_constraint_args[1]];
        if (typeof param_1_addr === "number" && typeof param_2_addr === "number") {
          if (this.gcs.get_is_fixed(param_1_addr) && !this.gcs.get_is_fixed(param_2_addr)) {
            this.gcs.set_p_param(param_2_addr, this.gcs.get_p_param(param_1_addr), false);
          } else if (this.gcs.get_is_fixed(param_2_addr) && !this.gcs.get_is_fixed(param_1_addr)) {
            this.gcs.set_p_param(param_1_addr, this.gcs.get_p_param(param_2_addr), false);
          }
        }
      }
      for (const geom_shape of deletable) {
        geom_shape.delete();
      }
    }
    // delete_constraint_by_id(id: oid): boolean {
    //     if (id !== '-1') {
    //         const item = this.sketch_index.get_primitive(id);
    //         if (item !== undefined && !is_sketch_geometry(item)) {
    //             throw new Error(`object #${id} (${item.type}) is not a constraint (delete_constraint_by_id)`);
    //         }
    //     }
    //     this.gcs.clear_by_id(id);
    //     return this.sketch_index.delete_primitive(id);
    // }
    get_primitive_addr(id) {
      const addr = this.p_param_index.get(id);
      if (addr === void 0) {
        throw new Error(`sketch object ${id} not found in p-params index`);
      }
      return addr;
    }
    // ------- GCS -> Sketch ------- (when retrieving a solution)
    pull_primitive(p) {
      if (this.p_param_index.has(p.id)) {
        if (p.type === "point") {
          this.pull_point(p);
        } else if (p.type === "line") {
          this.pull_line(p);
        } else if (p.type === "arc") {
          this.pull_arc(p);
        } else if (p.type === "circle") {
          this.pull_circle(p);
        } else if (p.type === "ellipse") {
          this.pull_ellipse(p);
        } else if (p.type === "arc_of_ellipse") {
          this.pull_arc_of_ellipse(p);
        } else if (p.type === "hyperbola") {
          this.pull_hyperbola(p);
        } else if (p.type === "arc_of_hyperbola") {
          this.pull_arc_of_hyperbola(p);
        } else if (p.type === "parabola") {
          this.pull_parabola(p);
        } else if (p.type === "arc_of_parabola") {
          this.pull_arc_of_parabola(p);
        } else if (p.type === "bspline") {
          this.pull_bspline(p);
        } else if (is_sketch_constraint(p)) {
          this.pull_constraint(p);
        } else {
          this.sketch_index.set_primitive(p);
        }
      } else {
        this.sketch_index.set_primitive(p);
      }
    }
    pull_point(p) {
      const point_addr = this.get_primitive_addr(p.id);
      const point = Object.assign(Object.assign({}, p), { x: this.gcs.get_p_param(point_addr + property_offsets.point.x), y: this.gcs.get_p_param(point_addr + property_offsets.point.y) });
      this.sketch_index.set_primitive(point);
    }
    pull_line(l) {
      this.sketch_index.set_primitive(l);
    }
    pull_arc(a) {
      const addr = this.get_primitive_addr(a.id);
      this.sketch_index.set_primitive(Object.assign(Object.assign({}, a), { start_angle: this.gcs.get_p_param(addr + property_offsets.arc.start_angle), end_angle: this.gcs.get_p_param(addr + property_offsets.arc.end_angle), radius: this.gcs.get_p_param(addr + property_offsets.arc.radius) }));
    }
    pull_circle(c) {
      const addr = this.get_primitive_addr(c.id);
      this.sketch_index.set_primitive(Object.assign(Object.assign({}, c), { radius: this.gcs.get_p_param(addr + property_offsets.circle.radius) }));
    }
    pull_ellipse(e) {
      const addr = this.get_primitive_addr(e.id);
      this.sketch_index.set_primitive(Object.assign(Object.assign({}, e), { radmin: this.gcs.get_p_param(addr + property_offsets.ellipse.radmin) }));
    }
    pull_arc_of_ellipse(ae) {
      const addr = this.get_primitive_addr(ae.id);
      this.sketch_index.set_primitive(Object.assign(Object.assign({}, ae), { start_angle: this.gcs.get_p_param(addr + property_offsets.arc_of_ellipse.start_angle), end_angle: this.gcs.get_p_param(addr + property_offsets.arc_of_ellipse.end_angle), radmin: this.gcs.get_p_param(addr + property_offsets.arc_of_ellipse.radmin) }));
    }
    pull_hyperbola(h) {
      const addr = this.get_primitive_addr(h.id);
      this.sketch_index.set_primitive(Object.assign(Object.assign({}, h), { radmin: this.gcs.get_p_param(addr + property_offsets.hyperbola.radmin) }));
    }
    pull_arc_of_hyperbola(ah) {
      const addr = this.get_primitive_addr(ah.id);
      this.sketch_index.set_primitive(Object.assign(Object.assign({}, ah), { start_angle: this.gcs.get_p_param(addr + property_offsets.arc_of_hyperbola.start_angle), end_angle: this.gcs.get_p_param(addr + property_offsets.arc_of_hyperbola.end_angle), radmin: this.gcs.get_p_param(addr + property_offsets.arc_of_hyperbola.radmin) }));
    }
    pull_parabola(p) {
      this.sketch_index.set_primitive(p);
    }
    pull_arc_of_parabola(ap) {
      const addr = this.get_primitive_addr(ap.id);
      this.sketch_index.set_primitive(Object.assign(Object.assign({}, ap), { start_angle: this.gcs.get_p_param(addr + property_offsets.arc_of_parabola.start_angle), end_angle: this.gcs.get_p_param(addr + property_offsets.arc_of_parabola.end_angle) }));
    }
    pull_bspline(b) {
      this.sketch_index.set_primitive(b);
    }
    pull_constraint(c) {
      if (c.driving !== false) {
        return;
      }
      const constraint_addr = this.get_primitive_addr(c.id);
      const offsets = this.nondriving_constraint_params_order.get(c.id);
      if (!offsets) {
        console.warn(`No offsets for constraint type ${c.type}`);
        return;
      }
      const constraint_copy = Object.assign({}, c);
      function update_property(obj, key, value) {
        obj[key] = value;
      }
      for (const [offset, constraint_property_name] of offsets.entries()) {
        const param = this.gcs.get_p_param(constraint_addr + offset);
        update_property(constraint_copy, constraint_property_name, param);
      }
      this.sketch_index.set_primitive(constraint_copy);
    }
  };
  return __toCommonJS(planegcs_entry_exports);
})();

/**
 * PlanegcsLib - PWA用公開API
 * window.PlanegcsLib として公開される
 */
(function() {
  const { GcsWrapper, SolveStatus } = _PlanegcsModules;

  let _wasmMod = null;
  let _gcs = null;
  let _initPromise = null;

  function _getBaseUrl() {
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      if (s.src && s.src.includes('planegcs_modules')) {
        return s.src.replace(/[^/]*$/, '');
      }
    }
    return './';
  }

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      const baseUrl = _getBaseUrl();
      // planegcs.js (Emscripten WASMローダー) を動的import
      const m = await import(/* webpackIgnore: true */ baseUrl + 'planegcs.js');
      const PlaneGCSFactory = m.default || m.Module || Object.values(m)[0];
      _wasmMod = await PlaneGCSFactory({
        locateFile: (f) => baseUrl + f,
        print: () => {},
        printErr: () => {},
      });
      _gcs = new GcsWrapper(new _wasmMod.GcsSystem());
      console.log('[PlanegcsLib] initialized');
    })();
    return _initPromise;
  }

  /**
   * 拘束ソルバーを実行
   * @param {Array} primitives - [{id, type, ...}, ...]
   * @returns {{ status: number, points: Object }} status=0で成功
   */
  function solve(primitives) {
    if (!_gcs) { console.error('PlanegcsLib not initialized'); return { status: -1, points: {} }; }
    try {
      _gcs.push_primitives_and_params(primitives);
      const status = _gcs.solve();
      const points = {};
      if (status === SolveStatus.Success || status === SolveStatus.Converged) {
        _gcs.apply_solution();
        const solved = _gcs.sketch_index.get_primitives();
        for (const p of solved) {
          if (p.type === 'point') points[p.id] = { x: p.x, y: p.y };
        }
      }
      return { status, points };
    } finally {
      _gcs.clear_data();
    }
  }

  function destroy() {
    if (_gcs) { _gcs.destroy_gcs_module(); _gcs = null; }
    _wasmMod = null; _initPromise = null;
  }

  window.PlanegcsLib = { init, solve, destroy, SolveStatus, isReady: () => _gcs !== null };
})();
