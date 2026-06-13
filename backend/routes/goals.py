import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import supabase

logger = logging.getLogger(__name__)

goals_bp = Blueprint("goals", __name__)


@goals_bp.route("/goals", methods=["GET"])
@jwt_required()
def get_goals():
    try:
        user_id = get_jwt_identity()
        result = supabase.table("goals").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        goals = result.data or []
        
        if goals:
            # Auto-calculate proportional progress from live portfolio
            from services.portfolio import calculate_portfolio_performance
            holdings = supabase.table("virtual_holdings").select("*").eq("user_id", user_id).execute().data or []
            perf = calculate_portfolio_performance(holdings)
            total_portfolio_value = float(perf.get('total_value_pkr', 0))
            
            total_target = sum(float(g.get('target_pkr', 0)) for g in goals)
            if total_target > 0:
                for goal in goals:
                    target = float(goal.get('target_pkr', 0))
                    proportion = target / total_target
                    allocated = total_portfolio_value * proportion
                    # Goal progress is capped at target amount so it doesn't show >100%
                    goal['current_pkr'] = min(target, allocated)

        return jsonify({"goals": goals}), 200
    except Exception as e:
        logger.error(f"Error fetching goals: {e}")
        return jsonify({"error": str(e)}), 500


@goals_bp.route("/goals", methods=["POST"])
@jwt_required()
def create_goal():
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        required_fields = ["name", "target_pkr"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        new_goal = {
            "user_id": user_id,
            "name": data["name"],
            "target_pkr": float(data["target_pkr"]),
            "current_pkr": float(data.get("current_pkr") or 0),
            "deadline": data.get("deadline") if data.get("deadline") else None,
            "icon": data.get("icon", "Target"),
            "priority": data.get("priority", "medium"),
        }

        result = supabase.table("goals").insert(new_goal).execute()
        if not result.data:
            return jsonify({"error": "Failed to create goal"}), 500

        return jsonify({"message": "Goal created successfully", "goal": result.data[0]}), 201
    except Exception as e:
        logger.error(f"Error creating goal: {e}")
        return jsonify({"error": str(e)}), 500


@goals_bp.route("/goals/<goal_id>", methods=["PUT"])
@jwt_required()
def update_goal(goal_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        # Verify ownership
        check = supabase.table("goals").select("id").eq("id", goal_id).eq("user_id", user_id).execute()
        if not check.data:
            return jsonify({"error": "Goal not found or unauthorized"}), 404

        update_data = {}
        if "name" in data: update_data["name"] = data["name"]
        if "target_pkr" in data: update_data["target_pkr"] = float(data["target_pkr"])
        if "current_pkr" in data: update_data["current_pkr"] = float(data["current_pkr"])
        if "deadline" in data: update_data["deadline"] = data["deadline"] if data["deadline"] else None
        if "icon" in data: update_data["icon"] = data["icon"]
        if "priority" in data: update_data["priority"] = data["priority"]

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        result = supabase.table("goals").update(update_data).eq("id", goal_id).eq("user_id", user_id).execute()
        return jsonify({"message": "Goal updated successfully", "goal": result.data[0]}), 200
    except Exception as e:
        logger.error(f"Error updating goal: {e}")
        return jsonify({"error": str(e)}), 500


@goals_bp.route("/goals/<goal_id>", methods=["DELETE"])
@jwt_required()
def delete_goal(goal_id):
    try:
        user_id = get_jwt_identity()

        # Verify ownership and delete
        result = supabase.table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()

        if not result.data:
            return jsonify({"error": "Goal not found or unauthorized"}), 404

        return jsonify({"message": "Goal deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting goal: {e}")
        return jsonify({"error": str(e)}), 500
