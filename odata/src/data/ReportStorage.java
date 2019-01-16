package data;

import java.net.URI;
import java.net.URISyntaxException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Logger;

import org.apache.olingo.commons.api.data.Entity;
import org.apache.olingo.commons.api.data.EntityCollection;
import org.apache.olingo.commons.api.data.Property;
import org.apache.olingo.commons.api.data.ValueType;
import org.apache.olingo.commons.api.edm.EdmEntitySet;
import org.apache.olingo.commons.api.edm.geo.Geospatial.Dimension;
import org.apache.olingo.commons.api.edm.geo.Point;
import org.apache.olingo.commons.api.ex.ODataRuntimeException;
import org.smap.sdal.constants.SmapQuestionTypes;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.model.ColDesc;
import org.smap.sdal.model.SqlDesc;
import smapModels.ReportDetails;
import smapModels.ReportModel;

public class ReportStorage {

	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());
	
	//public Action action;
	public ResourceBundle localisation;
	public Connection sd;
	public Connection cResults;
	public Locale locale;
	public ReportModel reportModel;

	public ReportStorage(Connection sd, Connection cResults, Locale locale, ResourceBundle localisation, ReportModel reportModel) {
		this.sd = sd;
		this.cResults = cResults;
		this.locale = locale;
		this.localisation = localisation;
		this.reportModel = reportModel;
	}

	/* PUBLIC FACADE */

	public EntityCollection readEntitySetData(EdmEntitySet edmEntitySet) throws SQLException, Exception {

		EntityCollection retEntitySet = new EntityCollection();
		
		String esName = edmEntitySet.getName();
		ReportDetails rd = reportModel.reports.get(esName);
		if (rd.sqlDesc != null) {
			PreparedStatement pstmt = null;
			try {
				// Get Prepared Statment
				pstmt = cResults.prepareStatement(rd.sqlDesc.sql);
				
				ResultSet rs = pstmt.executeQuery();
				while(rs.next()) {
					System.out.println("Record: ");
					Entity e = getEntity(rs, rd.sqlDesc, esName);
					
					retEntitySet.getEntities().add(e);
				}
				
				
			} finally {
				try {
					if (pstmt != null) {	pstmt.close();}} catch (SQLException e) {}
			}
			
			return retEntitySet;
			
		}

		return null;
	}
/*
	public Entity readEntityData(EdmEntitySet edmEntitySet, List<UriParameter> keyParams)
			throws SQLException, Exception {

		Entity entity = null;
		
		EdmEntityType edmEntityType = edmEntitySet.getEntityType();
		String esName = edmEntitySet.getName();
		SurveyForm form = surveyModel.forms.get(esName);
		if (form != null) {
			PreparedStatement pstmt = null;
			try {
				// Get the key Filter
				ArrayList<KeyFilter> keyFilters = Util.getKeyFilter(edmEntityType, keyParams);
				
				// Get Prepared Statement
				TableDataManager tdm = new TableDataManager(localisation);
				pstmt = tdm.getPreparedStatement(sd, cResults, form.columns, surveyModel.urlprefix, form.survey.id,
						form.tableName, 
						0, // Parent key - set to zero to return all
						null, // HRK if not null will restrict to a specific HRK
						surveyModel.user, null, // Column name to sort on
						null, // Sort direction asc or desc
						false, // Set true to get managed form columns
						false, // Group only used when finding duplicate records
						false, // Kobo only, if true translate column names to kobo names
						0, // Start primary key
						0, // Number of records to return
						(form.parentform != 0), // get the parent key
						0, // Start parent key
						false, // Super user
						false, // Return records greater than or equal to primary key
						"no", // include bad
						null, // no custom filter
						keyFilters // Add key filters
				);
				
				ResultSet rs = pstmt.executeQuery();
				if(rs.next()) {
					entity = getEntity(rs, form);	
				}
				
			} finally {
				try {
					if (pstmt != null) {	pstmt.close();}} catch (SQLException e) {}
			}
		}

		return entity;
	}
	*/

	/* INTERNAL */

	private URI createId(String entitySetName, Object id) {
		try {
			return new URI(entitySetName + "(" + String.valueOf(id) + ")");
		} catch (URISyntaxException e) {
			throw new ODataRuntimeException("Unable to create id for entity: " + entitySetName, e);
		}
	}
	
	private Entity getEntity(ResultSet rs, SqlDesc sqlDesc, String esName) throws SQLException {
		int idx = 1;
		int prikey = 0;
		Entity e = new Entity();
		
		for (ColDesc c : sqlDesc.column_details) {
			String name = c.column_name;
			String type = c.qType;
			
			if(name.equals("prikey")) {
				name = "ID";
				prikey = rs.getInt(idx);
				type = "int";
			} else if(name.equals("parkey")) {
				type = "int";
			}
			
			if(type.equals(SmapQuestionTypes.INT)) {
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, rs.getInt(idx++)));
			
			} else if(type.equals(SmapQuestionTypes.DECIMAL)) {
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, rs.getDouble(idx++)));
			
			} else if(type.equals(SmapQuestionTypes.DATE)) {
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, rs.getDate(idx++)));			
			
			} else if(type.equals(SmapQuestionTypes.DATETIME)) {
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, rs.getTimestamp(idx++)));			
			
			} else if(type.equalsIgnoreCase(SmapQuestionTypes.STRING) ||
						type.equalsIgnoreCase(SmapQuestionTypes.SELECT1) ||
						type.equalsIgnoreCase(SmapQuestionTypes.CALCULATE)
						) {
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, rs.getString(idx++)));
			
			} else if(type.equalsIgnoreCase("geometry")) {
				
				Point p = new Point(Dimension.GEOGRAPHY, null);
				setPoint(p, rs.getString(idx++));
				System.out.println("Adding point");
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, p));
				System.out.println("Done Adding point");
		}else {
				log.info("Error: Unknown table column type: " + type + " processing as string");
				String sValue = rs.getString(idx++);			
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, sValue));
			}
		}
		e.setId(createId(esName, prikey));
		
		return e;
	}
	
	void setPoint(Point p, String s) {
		double x = 0.0;
		double y = 0.0;
		if(s != null) {
			s = s.trim();
			int idx = s.indexOf('(');
			if(idx >=0) {
				s = s.substring(idx + 1, s.length() - 1);
				String[] coords = s.split(" ");
				if(coords.length > 1) {
					x = Double.parseDouble(coords[0]);
					y = Double.parseDouble(coords[1]);
				}
			}
			
		}
		p.setX(x);
		p.setY(y);
	}
}
